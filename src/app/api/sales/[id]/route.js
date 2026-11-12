import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { roundMoney } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';
export async function GET(_request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    const snap = await db().collection('sales').doc((await params).id).get();
    if (!snap.exists) return fail('Comprobante no encontrado.', 404);
    const sale = snap.data();
    if (sale.ownerId !== user.businessId || (user.role === 'cashier' && sale.cashierId !== user.uid)) return fail('Sin permiso.', 403);
    return json({ sale: { id: snap.id, ...sale } });
  } catch (error) { return safeError(error); }
}

export async function PATCH(request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Solo el propietario puede anular una venta.', 403);
    const id = (await params).id;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return fail('Venta inválida.');
    const body = await request.json();
    const reason = String(body?.reason || '').trim();
    if (reason.length < 5 || reason.length > 160) return fail('Explicá el motivo de la anulación en 5 a 160 caracteres.');
    const database = db();
    const saleRef = database.collection('sales').doc(id);
    const businessRef = database.collection('businesses').doc(user.businessId);
    const result = await database.runTransaction(async transaction => {
      const saleSnap = await transaction.get(saleRef);
      if (!saleSnap.exists || saleSnap.data().ownerId !== user.businessId) throw new Error('Venta no encontrada.');
      const sale = saleSnap.data();
      if (sale.status === 'voided') return { id, ...sale };
      const business = await transaction.get(businessRef);
      if (business.data()?.activeSessionId !== sale.cashSessionId) throw new Error('Solo podés anular ventas de la caja que sigue abierta.');
      const sessionRef = database.collection('cashSessions').doc(sale.cashSessionId);
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists || sessionSnap.data().status !== 'open') throw new Error('La caja de esta venta ya está cerrada.');
      const refs = sale.items.map(item => database.collection('products').doc(item.productId));
      const products = await Promise.all(refs.map(ref => transaction.get(ref)));
      if (products.some((snap, index) => !snap.exists || snap.data().ownerId !== user.businessId || !Number.isInteger(sale.items[index].quantity))) throw new Error('No se puede reponer stock: falta un producto de la venta.');
      const cashPortion = roundMoney((sale.payments || [{ method: sale.paymentMethod, amount: sale.total }]).filter(payment => payment.method === 'cash').reduce((sum, payment) => sum + payment.amount, 0));
      const voidedAt = new Date().toISOString();
      for (let index = 0; index < refs.length; index++) {
        const item = sale.items[index];
        const previousStock = products[index].data().stock;
        const newStock = previousStock + item.quantity;
        transaction.update(refs[index], { stock: newStock, updatedAt: voidedAt });
        transaction.create(database.collection('inventoryMovements').doc(`${id}_void_${item.productId}`), {
          ownerId: user.businessId, businessId: user.businessId, saleId: id,
          productId: item.productId, productName: item.name, previousStock, newStock,
          delta: item.quantity, reason: 'sale_void', actorId: user.uid, createdAt: voidedAt,
        });
      }
      transaction.update(saleRef, { status: 'voided', voidReason: reason, voidedAt, voidedBy: user.uid });
      transaction.update(sessionRef, {
        grossTotal: roundMoney(Math.max(0, sessionSnap.data().grossTotal - sale.total)),
        cashSalesTotal: roundMoney(Math.max(0, sessionSnap.data().cashSalesTotal - cashPortion)),
        salesCount: Math.max(0, sessionSnap.data().salesCount - 1),
        voidedTotal: roundMoney((sessionSnap.data().voidedTotal || 0) + sale.total),
        voidCount: (sessionSnap.data().voidCount || 0) + 1,
      });
      return { id, ...sale, status: 'voided', voidReason: reason, voidedAt, voidedBy: user.uid };
    });
    return json({ sale: result });
  } catch (error) {
    if (['Venta no encontrada.', 'Solo podés anular ventas de la caja que sigue abierta.', 'La caja de esta venta ya está cerrada.', 'No se puede reponer stock: falta un producto de la venta.'].includes(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
