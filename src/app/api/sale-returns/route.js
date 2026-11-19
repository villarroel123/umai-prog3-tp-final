import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { roundMoney } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

const validId = value => /^[A-Za-z0-9_-]{1,100}$/.test(String(value || ''));

export async function GET(request) {
  try {
    const user = await sessionUser();
    if (!user || !['business_owner', 'cashier'].includes(user.role)) return fail('Sin permiso.', 403);
    if (user.role === 'cashier' && user.permissions?.processReturns !== true) return fail('Sin permiso para devoluciones.', 403);
    const receipt = Number(new URL(request.url).searchParams.get('receipt'));
    if (!Number.isSafeInteger(receipt) || receipt < 1) return fail('Ingresá un número de comprobante válido.');
    const business = await db().collection('businesses').doc(user.businessId).get();
    const matches = await db().collection('sales').where('receiptNumber', '==', receipt).get();
    const sale = matches.docs.find(doc => doc.data().ownerId === user.businessId);
    if (!sale) return fail('Comprobante no encontrado.', 404);
    if (!business.data()?.activeSessionId) return fail('Abrí una caja antes de registrar devoluciones.', 409);
    return json({ sale: { id: sale.id, ...sale.data() } });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user || !['business_owner', 'cashier'].includes(user.role)) return fail('Sin permiso.', 403);
    if (user.role === 'cashier' && user.permissions?.processReturns !== true) return fail('Sin permiso para devoluciones.', 403);
    const body = await request.json();
    const { saleId, returnId } = body || {};
    const reason = String(body?.reason || '').trim();
    const method = String(body?.method || 'cash');
    if (!validId(saleId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(returnId || '')) return fail('Identificador de devolución inválido.');
    if (reason.length < 5 || reason.length > 160) return fail('Explicá el motivo en 5 a 160 caracteres.');
    if (!['cash', 'card', 'transfer'].includes(method)) return fail('Medio de reintegro inválido.');
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) return fail('Elegí los artículos a devolver.');
    const requested = new Map();
    for (const item of body.items) {
      if (!validId(item?.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || requested.has(item.productId)) return fail('Revisá las cantidades a devolver.');
      requested.set(item.productId, item.quantity);
    }
    const database = db();
    const businessRef = database.collection('businesses').doc(user.businessId);
    const saleRef = database.collection('sales').doc(saleId);
    const returnRef = database.collection('saleReturns').doc(returnId);
    const result = await database.runTransaction(async transaction => {
      const existing = await transaction.get(returnRef);
      if (existing.exists) {
        const prior = existing.data();
        const sameItems = prior.items?.length === requested.size && prior.items.every(item => requested.get(item.productId) === item.quantity);
        if (prior.saleId !== saleId || prior.actorId !== user.uid || prior.reason !== reason || prior.method !== method || !sameItems) throw new Error('Esta solicitud de devolución ya fue usada.');
        return { id: existing.id, ...existing.data() };
      }
      const [business, saleSnap] = await Promise.all([transaction.get(businessRef), transaction.get(saleRef)]);
      if (!business.exists || !saleSnap.exists || saleSnap.data().ownerId !== user.businessId) throw new Error('Comprobante no encontrado.');
      const sale = saleSnap.data();
      if (!['completed', 'partially_returned'].includes(sale.status) || !business.data().activeSessionId) throw new Error('La venta no admite más devoluciones o no hay una caja abierta.');
      const sessionRef = database.collection('cashSessions').doc(business.data().activeSessionId);
      const session = await transaction.get(sessionRef);
      if (!session.exists || session.data().status !== 'open' || session.data().ownerId !== user.businessId) throw new Error('La caja de esta venta ya está cerrada.');
      let authorizedBy = user.uid;
      if (user.role === 'cashier') {
        const employee = await transaction.get(businessRef.collection('cashiers').doc(user.uid));
        if (!employee.exists || employee.data().status !== 'active' || employee.data().permissions?.processReturns !== true || !employee.data().returnsAuthorizedBy) throw new Error('La devolución requiere autorización del jefe.');
        if (!employee.data().registerId || employee.data().registerId !== (session.data().registerId || session.data().registerName)) throw new Error('La caja activa no corresponde a la caja asignada.');
        authorizedBy = employee.data().returnsAuthorizedBy;
      }
      const originalItems = new Map(sale.items.map(item => [item.productId, item]));
      const previous = sale.returnedQuantities || {};
      const productRefs = [...requested.keys()].map(id => database.collection('products').doc(id));
      const products = await Promise.all(productRefs.map(ref => transaction.get(ref)));
      let rawRefund = 0;
      const items = [...requested].map(([productId, quantity], index) => {
        const original = originalItems.get(productId);
        if (!original || !Number.isInteger(original.quantity) || (previous[productId] || 0) + quantity > original.quantity) throw new Error('La cantidad supera lo pendiente por devolver.');
        if (!products[index].exists || products[index].data().ownerId !== user.businessId) throw new Error('No se puede reponer stock: falta un producto.');
        rawRefund += original.lineTotal * quantity / original.quantity;
        return { productId, name: original.name, quantity };
      });
      const returnedQuantities = { ...previous };
      for (const item of items) returnedQuantities[item.productId] = (returnedQuantities[item.productId] || 0) + item.quantity;
      const full = sale.items.every(item => returnedQuantities[item.productId] === item.quantity);
      const alreadyRefunded = sale.refundedTotal || 0;
      const amount = full ? roundMoney(sale.total - alreadyRefunded) : Math.min(roundMoney(sale.total - alreadyRefunded), roundMoney(rawRefund * sale.total / sale.subtotal));
      if (amount <= 0) throw new Error('El importe de devolución no es válido.');
      const cashExpected = roundMoney(session.data().openingAmount + (session.data().cashSalesTotal || 0) + (session.data().cashAdjustmentsTotal || 0));
      if (method === 'cash' && cashExpected < amount) throw new Error('El efectivo esperado en caja no alcanza para el reintegro.');
      const createdAt = new Date().toISOString();
      items.forEach((item, index) => {
        const before = products[index].data().stock;
        transaction.update(productRefs[index], { stock: before + item.quantity, updatedAt: createdAt });
        transaction.create(database.collection('inventoryMovements').doc(`${returnId}_${item.productId}`), { ownerId: user.businessId, businessId: user.businessId, saleId, returnId, productId: item.productId, productName: item.name, previousStock: before, newStock: before + item.quantity, delta: item.quantity, reason: 'sale_return', actorId: user.uid, authorizedBy, createdAt });
      });
      const refundedByMethod = { ...(sale.refundedByMethod || {}) };
      refundedByMethod[method] = roundMoney((refundedByMethod[method] || 0) + amount);
      transaction.update(saleRef, { status: full ? 'returned' : 'partially_returned', returnedQuantities, refundedTotal: roundMoney(alreadyRefunded + amount), refundedByMethod, lastReturnedAt: createdAt, lastReturnedBy: user.uid, lastReturnAuthorizedBy: authorizedBy, lastReturnReason: reason, lastReturnMethod: method });
      transaction.update(sessionRef, { grossTotal: roundMoney(session.data().grossTotal - amount), cashSalesTotal: roundMoney((session.data().cashSalesTotal || 0) - (method === 'cash' ? amount : 0)), salesCount: full && sale.cashSessionId === sessionRef.id ? Math.max(0, session.data().salesCount - 1) : session.data().salesCount, returnedTotal: roundMoney((session.data().returnedTotal || 0) + amount), returnCount: (session.data().returnCount || 0) + 1 });
      const record = { ownerId: user.businessId, businessId: user.businessId, saleId, receiptNumber: sale.receiptNumber, cashSessionId: sessionRef.id, originalCashSessionId: sale.cashSessionId, items, amount, method, reason, actorId: user.uid, actorName: user.name, authorizedBy, createdAt };
      transaction.create(returnRef, record);
      return { id: returnId, ...record };
    });
    return json({ saleReturn: result }, 201);
  } catch (error) {
    if (/^(Esta solicitud|Comprobante|La venta|La caja|La devolución|La cantidad|No se puede reponer|El importe|El efectivo)/.test(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
