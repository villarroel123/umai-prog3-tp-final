import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSales, salesCsv, summarizeSales } from '../src/lib/reports.js';

const sales = [
  { id: 'a', receiptNumber: 1, createdAt: '2026-11-08T12:00:00.000Z', status: 'completed', businessName: 'Almacén', buyerName: 'Cliente', items: [{ productId: 'p', name: 'Pan', code: '123', quantity: 2, lineTotal: 100 }], payments: [{ method: 'cash', amount: 60 }, { method: 'card', amount: 40 }], total: 100 },
  { id: 'b', receiptNumber: 2, createdAt: '2026-11-08T13:00:00.000Z', status: 'voided', businessName: 'Almacén', buyerName: 'Cliente', items: [{ productId: 'p', name: 'Pan', code: '123', quantity: 1, lineTotal: 50 }], payments: [{ method: 'cash', amount: 50 }], total: 50, voidReason: '=DATO' },
];

test('los reportes excluyen anulaciones de los totales sin ocultarlas del historial', () => {
  const summary = summarizeSales(sales);
  assert.equal(summary.count, 1);
  assert.equal(summary.voidCount, 1);
  assert.equal(summary.total, 100);
  assert.deepEqual(summary.paymentTotals, { cash: 60, card: 40, transfer: 0 });
  assert.equal(summary.products[0].quantity, 2);
});

test('los filtros incluyen pagos divididos y el CSV neutraliza fórmulas', () => {
  assert.equal(filterSales(sales, { from: '2026-11-08', to: '2026-11-08', product: 'pan', payment: 'card' }).length, 1);
  assert.match(salesCsv(sales), /"'=DATO"/);
});

test('una devolución parcial descuenta unidades y dinero sin borrar la operación', () => {
  const partial = { ...sales[0], status: 'partially_returned', returnedQuantities: { p: 1 }, refundedTotal: 50, refundedByMethod: { cash: 50 } };
  const summary = summarizeSales([partial]);
  assert.equal(summary.count, 1);
  assert.equal(summary.total, 50);
  assert.equal(summary.products[0].quantity, 1);
  assert.deepEqual(summary.paymentTotals, { cash: 10, card: 40, transfer: 0 });
  assert.match(salesCsv([partial]), /Devolución parcial/);
});
