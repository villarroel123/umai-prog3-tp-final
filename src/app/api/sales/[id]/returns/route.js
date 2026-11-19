import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { roundMoney } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const user = await sessionUser();
    if (!user) return fail('IniciÃ¡ sesiÃ³n.', 401);
    if (user.role !== 'business_owner') return fail('Solo el propietario puede registrar notas de crÃ©dito.', 403);
    const saleId = (await params).id;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(saleId)) return fail('Venta invÃ¡lida.');
    const body = await request.json();
    const creditId = String(body?.creditId || '');
    const reason = String(body?.reason || '').trim();
    const refundMethod = String(body?.refundMethod || 'cash');
    if (!/^[0-9a-f-]{36}$/i.test(creditId) || reason.length < 3 || reason.length > 160 || !['cash', 'card', 'transfer'].includes(refundMethod)) return fail('RevisÃ¡ el motivo y el medio de devoluciÃ³n.');
    if (!Array.isArray(body?.items) || !body.items.length || body.items.length > 50) return fail('IndicÃ¡ los productos devueltos.');

    const database = db();
    const saleRef = database.collection('sales').doc(saleId);
    const creditRef = database.collection('creditNotes').doc(creditId);
    const businessRef = database.collection('businesses').doc(user.businessId);
    const result = await database.runTransaction(async transaction => {
      const existing = await transaction.get(creditRef);
      if (existing.exists) return existing.data().ownerId === user.businessId ? { id: existing.id, ...existing.data() } : null;
      const saleSnap = await transaction.get(saleRef);
      if (!saleSnap.exists || saleSnap.data().ownerId !== user.businessId || saleSnap.data().status !== 'completed') throw new Error('Venta no disponible para devolución.');
      const sale = saleSnap.data();
      const businessSnap = await transaction.get(businessRef);
      const activeSessionId = businessSnap.data()?.activeSessionId;
      if (!activeSessionId) throw new Error('Venta no disponible para devolucion: abre una caja.');
      const sessionRef = database.collection('cashSessions').doc(activeSessionId);
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists || sessionSnap.data().status !== 'open') throw new Error('La caja de esta venta ya estÃ¡ cerrada.');
      const creditsQuery = database.collection('creditNotes').where('saleId', '==', saleId);
      const creditsSnap = await transaction.get(creditsQuery);
      const alreadyReturned = new Map();
      for (const credit of creditsSnap.docs) for (const item of credit.data().items || []) alreadyReturned.set(item.productId, (alreadyReturned.get(item.productId) || 0) + item.quantity);
      const requested = new Map();
      for (const row of body.items) {
        const productId = String(row?.productId || '');
        const quantity = Number(row?.quantity);
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(productId) || !Number.isSafeInteger(quantity) || quantity < 1 || requested.has(productId)) throw new Error('RevisÃ¡ los productos y cantidades devueltos.');
        requested.set(productId, quantity);
      }
      const saleItems = new Map(sale.items.map(item => [item.productId, item]));
      const returnedLines = [...requested].map(([productId, quantity]) => {
        const item = saleItems.get(productId);
        if (!item || quantity + (alreadyReturned.get(productId) || 0) > item.quantity) throw new Error(`La cantidad devuelta supera la venta de ${item?.name || 'ese producto'}.`);
        const subtotal = sale.items.reduce((sum, saleItem) => sum + saleItem.lineTotal, 0);
        const amount = roundMoney(sale.total * (item.lineTotal / subtotal) * (quantity / item.quantity));
        return { productId, code: item.code, name: item.name, quantity, amount };
      });
      const total = roundMoney(returnedLines.reduce((sum, item) => sum + item.amount, 0));
      if (total <= 0) throw new Error('El importe de la devoluciÃ³n debe ser mayor a cero.');
      const productRefs = returnedLines.map(item => database.collection('products').doc(item.productId));
      const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));
      if (productSnaps.some(snap => !snap.exists || snap.data().ownerId !== user.businessId)) throw new Error('No se puede reponer uno de los productos.');
      const createdAt = new Date().toISOString();
      for (let index = 0; index < returnedLines.length; index++) {
        const item = returnedLines[index];
        const previousStock = productSnaps[index].data().stock;
        transaction.update(productRefs[index], { stock: previousStock + item.quantity, updatedAt: createdAt });
        transaction.create(database.collection('inventoryMovements').doc(`${creditId}_${item.productId}`), { ownerId: user.businessId, businessId: user.businessId, creditNoteId: creditId, saleId, productId: item.productId, productName: item.name, previousStock, newStock: previousStock + item.quantity, delta: item.quantity, reason: 'credit_note', actorId: user.uid, createdAt });
      }
      const note = { ownerId: user.businessId, businessId: user.businessId, saleId, cashSessionId: activeSessionId, receiptNumber: sale.receiptNumber, refundMethod, items: returnedLines, total, reason, actorId: user.uid, createdAt };
      transaction.create(creditRef, note);
      const session = sessionSnap.data();
      transaction.update(sessionRef, {
        grossTotal: roundMoney(Math.max(0, session.grossTotal - total)),
        creditTotal: roundMoney((session.creditTotal || 0) + total),
        cashSalesTotal: refundMethod === 'cash' ? roundMoney(session.cashSalesTotal - total) : session.cashSalesTotal,
      });
      return { id: creditId, ...note };
    });
    return result ? json({ creditNote: result }, 201) : fail('Nota de crÃ©dito invÃ¡lida.', 409);
  } catch (error) {
    if (/^(Venta no disponible|Las devoluciones|La caja de esta venta|RevisÃ¡ los productos|La cantidad devuelta|El importe de la devoluciÃ³n|No se puede reponer)/.test(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
