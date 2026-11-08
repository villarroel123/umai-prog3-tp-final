import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCheckout } from '../src/lib/sale-checkout.js';
import { recordSale } from '../src/lib/sale-service.js';
import { filterSales, salesSummary } from '../src/lib/sale-history.js';
import { buildOverview } from '../src/lib/overview.js';

const owner = { uid: 'owner-1', businessId: 'owner-1', name: 'Dueña' };
const uuid = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const checkout = (id, payments = [{ method: 'cash', amount: 200 }], extra = {}) => parseCheckout({
  checkoutId: uuid(id), items: [{ productId: 'p1', quantity: 1 }], payments,
  amountReceived: payments.some(payment => payment.method === 'cash') ? 250 : 0,
  ...extra,
});

function memoryDb(stock = 2) {
  const rows = new Map();
  const put = (path, data) => rows.set(path, { version: (rows.get(path)?.version || 0) + 1, data: structuredClone(data) });
  put('businesses/owner-1', { ownerId: owner.uid, activeSessionId: 'session-1', nextReceiptNumber: 1 });
  put('cashSessions/session-1', { ownerId: owner.uid, businessName: 'Mi negocio', registerName: 'Caja 1', status: 'open', salesCount: 0, grossTotal: 0, cashSalesTotal: 0 });
  put('products/p1', { ownerId: owner.uid, name: 'Pan', code: 'P1', unit: 'unidad', price: 200, stock, isActive: true });
  let failBeforeCommit = false;
  const db = {
    collection(name) { return { doc(id) { return { id, path: `${name}/${id}` }; } }; },
    async runTransaction(callback) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const reads = new Map();
        const writes = [];
        const transaction = {
          async get(ref) {
            const row = rows.get(ref.path);
            reads.set(ref.path, row?.version || 0);
            return { id: ref.id, exists: Boolean(row), data: () => structuredClone(row?.data) };
          },
          update(ref, data) { writes.push({ op: 'update', ref, data }); },
          create(ref, data) { writes.push({ op: 'create', ref, data }); },
        };
        const result = await callback(transaction);
        if (failBeforeCommit) throw new Error('Conexión interrumpida');
        if ([...reads].some(([path, version]) => (rows.get(path)?.version || 0) !== version)) continue;
        for (const write of writes) {
          if (write.op === 'create' && rows.has(write.ref.path)) throw new Error('Documento duplicado');
          if (write.op === 'update' && !rows.has(write.ref.path)) throw new Error('Documento ausente');
        }
        for (const write of writes) put(write.ref.path, write.op === 'update' ? { ...rows.get(write.ref.path).data, ...write.data } : write.data);
        return result;
      }
      throw new Error('Conflicto de transacción');
    },
  };
  return { db, rows, setFailBeforeCommit(value) { failBeforeCommit = value; }, data(path) { return rows.get(path)?.data; } };
}

test('registra efectivo, descuenta stock y crea el movimiento en la misma transacción', async () => {
  const state = memoryDb();
  const sale = await recordSale(state.db, owner, checkout(1));
  assert.equal(sale.total, 200);
  assert.equal(sale.change, 50);
  assert.equal(sale.receiptNumber, 1);
  assert.equal(sale.cashierId, owner.uid);
  assert.equal(state.data('products/p1').stock, 1);
  assert.equal(state.data(`inventoryMovements/${uuid(1)}_p1`).delta, -1);
  assert.equal(state.data('cashSessions/session-1').cashSalesTotal, 200);
});

test('tarjeta guarda referencia; transferencia exige confirmación manual', async () => {
  const state = memoryDb();
  const card = await recordSale(state.db, owner, checkout(2, [{ method: 'card', amount: 200, reference: 'OP-123' }]));
  assert.equal(card.payments[0].reference, 'OP-123');
  assert.equal(card.amountReceived, 0);
  assert.throws(() => checkout(3, [{ method: 'transfer', amount: 200 }]), /Confirmá que recibiste/);
  const transfer = await recordSale(state.db, owner, checkout(3, [{ method: 'transfer', amount: 200, reference: 'TR-8' }], { transferConfirmed: true }));
  assert.equal(transfer.payments[0].reference, 'TR-8');
  assert.equal(transfer.transferConfirmedBy, owner.uid);
});

test('pago dividido controla total y vuelto de la porción en efectivo', async () => {
  const state = memoryDb();
  const mixed = checkout(4, [{ method: 'cash', amount: 80 }, { method: 'card', amount: 120 }], { amountReceived: 100 });
  const sale = await recordSale(state.db, owner, mixed);
  assert.equal(sale.paymentMethod, 'mixed');
  assert.equal(sale.change, 20);
  await assert.rejects(recordSale(state.db, owner, checkout(5, [{ method: 'cash', amount: 199 }], { amountReceived: 200 })), /pagos deben sumar/);
});

test('rechaza dinero insuficiente, producto inactivo y stock agotado sin escribir venta', async () => {
  assert.throws(() => checkout(6, undefined, { amountReceived: 199 }), /efectivo recibido/);
  assert.throws(() => checkout(6, [{ method: 'cash', amount: 200.001 }]), /Importe del pago/);
  const state = memoryDb(0);
  await assert.rejects(recordSale(state.db, owner, checkout(6)), /Stock insuficiente/);
  assert.equal(state.data(`sales/${uuid(6)}`), undefined);
  assert.equal(state.data('businesses/owner-1').nextReceiptNumber, 1);
  state.rows.get('products/p1').data.stock = 1;
  state.rows.get('products/p1').data.isActive = false;
  await assert.rejects(recordSale(state.db, owner, checkout(6)), /ya no está disponible/);
});

test('rechaza ventas sin total positivo o de otro negocio', async () => {
  const state = memoryDb();
  await assert.rejects(recordSale(state.db, owner, checkout(11, undefined, { adjustment: { type: 'discount', percent: 100 } })), /total de la venta/);
  await assert.rejects(recordSale(state.db, { uid: 'otro-negocio', businessId: 'otro-negocio', name: 'Otra persona' }, checkout(12)), /No encontramos el negocio/);
  assert.equal(state.data('products/p1').stock, 2);
});

test('dos cobros simultáneos no venden dos veces la última unidad', async () => {
  const state = memoryDb(1);
  const results = await Promise.allSettled([recordSale(state.db, owner, checkout(7)), recordSale(state.db, owner, checkout(8))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal(state.data('products/p1').stock, 0);
  assert.equal(state.data('businesses/owner-1').nextReceiptNumber, 2);
});

test('reintento con igual clave devuelve la venta sin duplicar; con otro contenido se rechaza', async () => {
  const state = memoryDb();
  const first = await recordSale(state.db, owner, checkout(9));
  const repeated = await recordSale(state.db, owner, checkout(9));
  assert.deepEqual(repeated, first);
  assert.equal(state.data('cashSessions/session-1').salesCount, 1);
  await assert.rejects(recordSale(state.db, owner, checkout(9, [{ method: 'card', amount: 200 }])), /solicitud de cobro ya se usó/);
});

test('error antes del commit conserva stock, contador y ticket para reintentar', async () => {
  const state = memoryDb();
  state.setFailBeforeCommit(true);
  await assert.rejects(recordSale(state.db, owner, checkout(10)), /Conexión interrumpida/);
  assert.equal(state.data('products/p1').stock, 2);
  assert.equal(state.data('cashSessions/session-1').salesCount, 0);
  assert.equal(state.data(`sales/${uuid(10)}`), undefined);
  state.setFailBeforeCommit(false);
  assert.equal((await recordSale(state.db, owner, checkout(10))).receiptNumber, 1);
});

test('historial filtra y resume solo ventas completadas', () => {
  const sales = [
    { receiptNumber: 1, createdAt: '2026-11-08T14:00:00Z', paymentMethod: 'mixed', payments: [{ method: 'cash' }, { method: 'card' }], status: 'completed', total: 200 },
    { receiptNumber: 2, createdAt: '2026-11-08T15:00:00Z', paymentMethod: 'cash', status: 'voided', total: 50 },
  ];
  assert.equal(filterSales(sales, { search: 'V-000001', method: 'card' }).length, 1);
  assert.equal(filterSales(sales, { status: 'voided' }).length, 1);
  assert.deepEqual(salesSummary(sales), { total: 200, count: 1, average: 200 });
});

test('una venta confirmada alimenta historial, resumen y stock bajo', async () => {
  const state = memoryDb(1);
  const sale = await recordSale(state.db, owner, checkout(13));
  const history = filterSales([sale], { search: 'V-000001', method: 'cash' });
  const overview = buildOverview(history, [{ id: 'p1', stock: state.data('products/p1').stock, minStock: 2 }], new Date(sale.createdAt));
  assert.equal(salesSummary(history).total, 200);
  assert.equal(overview.todayCount, 1);
  assert.equal(overview.todayTotal, 200);
  assert.equal(overview.lowStock.length, 1);
});
