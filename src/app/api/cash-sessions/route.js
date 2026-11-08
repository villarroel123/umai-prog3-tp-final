import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { roundMoney } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

export async function GET(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'owner') return fail('Sin permiso.', 403);
    if (new URL(request.url).searchParams.get('history') === '1') {
      const history = await db().collection('cashSessions').where('ownerId', '==', user.businessId).get();
      return json({ sessions: history.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.openedAt.localeCompare(a.openedAt)) });
    }
    const business = await db().collection('businesses').doc(user.businessId).get();
    const activeId = business.data()?.activeSessionId;
    if (!activeId) {
      const history = await db().collection('cashSessions').where('ownerId', '==', user.businessId).get();
      const latest = history.docs.filter(doc => doc.data().status === 'closed').sort((a, b) => b.data().closedAt.localeCompare(a.data().closedAt))[0];
      return json({ session: null, businessName: business.data()?.name || 'Mi negocio', lastClosed: latest ? { id: latest.id, ...latest.data() } : null });
    }
    const snap = await db().collection('cashSessions').doc(activeId).get();
    return json({ session: snap.exists && snap.data().ownerId === user.businessId && snap.data().status === 'open' ? { id: snap.id, ...snap.data() } : null, businessName: business.data()?.name || 'Mi negocio' });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'owner') return fail('Solo un propietario puede abrir la caja.', 403);
    const body = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos de apertura inválidos.');
    const openingAmount = Number(body.openingAmount);
    const registerName = String(body.registerName || 'Caja 1').trim();
    const businessName = String(body.businessName || 'Mi negocio').trim();
    if (!Number.isFinite(openingAmount) || openingAmount < 0 || openingAmount > 100000000 || registerName.length < 2 || registerName.length > 30 || businessName.length < 2 || businessName.length > 60) return fail('Revisá el fondo inicial y los nombres del negocio y la caja.');
    const businessRef = db().collection('businesses').doc(user.businessId);
    const sessionRef = db().collection('cashSessions').doc();
    const session = { ownerId: user.businessId, businessId: user.businessId, openedBy: user.uid, businessName, registerName, openingAmount: roundMoney(openingAmount), cashAdjustmentsTotal: 0, cashMovementsCount: 0, voidedTotal: 0, voidCount: 0, cashSalesTotal: 0, grossTotal: 0, salesCount: 0, status: 'open', openedAt: new Date().toISOString() };
    const opened = await db().runTransaction(async transaction => {
      const business = await transaction.get(businessRef);
      if (business.data()?.activeSessionId) return false;
      transaction.set(sessionRef, session);
      transaction.set(businessRef, { ownerId: user.businessId, name: businessName, activeSessionId: sessionRef.id, nextReceiptNumber: business.data()?.nextReceiptNumber || 1 }, { merge: true });
      return true;
    });
    if (!opened) return fail('Ya hay una caja abierta.', 409);
    return json({ session: { id: sessionRef.id, ...session } }, 201);
  } catch (error) { return safeError(error); }
}

export async function PATCH(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'owner') return fail('Solo un propietario puede cerrar la caja.', 403);
    const body = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos de cierre inválidos.');
    const closingAmount = Number(body.closingAmount);
    if (!Number.isFinite(closingAmount) || closingAmount < 0 || closingAmount > 100000000) return fail('Ingresá el efectivo contado.');
    const businessRef = db().collection('businesses').doc(user.businessId);
    const closed = await db().runTransaction(async transaction => {
      const business = await transaction.get(businessRef);
      const id = business.data()?.activeSessionId;
      if (!id) return null;
      const sessionRef = db().collection('cashSessions').doc(id);
      const snap = await transaction.get(sessionRef);
      if (!snap.exists || snap.data().ownerId !== user.businessId || snap.data().status !== 'open') return null;
      const expectedClosingAmount = roundMoney(snap.data().openingAmount + snap.data().cashSalesTotal + (snap.data().cashAdjustmentsTotal || 0));
      const closed = { id, ...snap.data(), closingAmount: roundMoney(closingAmount), expectedClosingAmount, difference: roundMoney(closingAmount - expectedClosingAmount), status: 'closed', closedAt: new Date().toISOString() };
      transaction.update(sessionRef, { closingAmount: closed.closingAmount, expectedClosingAmount, difference: closed.difference, status: 'closed', closedAt: closed.closedAt });
      transaction.update(businessRef, { activeSessionId: null });
      return closed;
    });
    return closed ? json({ session: closed }) : fail('No hay una caja abierta.', 409);
  } catch (error) { return safeError(error); }
}
