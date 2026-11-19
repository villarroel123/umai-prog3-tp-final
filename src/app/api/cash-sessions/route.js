import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { roundMoney } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

function argentinaDay(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = Object.fromEntries(parts.map(item => [item.type, item.value]));
  return `${part.year}-${part.month}-${part.day}`;
}

export async function GET(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (!['business_owner', 'cashier'].includes(user.role)) return fail('Sin permiso.', 403);
    if (user.role === 'cashier' && user.permissions?.sell !== true && user.permissions?.manageCash !== true) return fail('Sin permiso.', 403);
    if (new URL(request.url).searchParams.get('history') === '1') {
      if (user.role !== 'business_owner') return fail('Sin permiso.', 403);
      const history = await db().collection('cashSessions').where('ownerId', '==', user.businessId).get();
      return json({ sessions: history.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.openedAt.localeCompare(a.openedAt)) });
    }
    const business = await db().collection('businesses').doc(user.businessId).get();
    const activeId = business.data()?.activeSessionId;
    if (!activeId) {
      if (user.role === 'cashier') return json({ session: null, businessName: business.data()?.name || 'Mi negocio', lastClosed: null });
      const history = await db().collection('cashSessions').where('ownerId', '==', user.businessId).get();
      const latest = history.docs.filter(doc => doc.data().status === 'closed').sort((a, b) => b.data().closedAt.localeCompare(a.data().closedAt))[0];
      return json({ session: null, businessName: business.data()?.name || 'Mi negocio', lastClosed: latest ? { id: latest.id, ...latest.data() } : null });
    }
    const snap = await db().collection('cashSessions').doc(activeId).get();
    if (user.role === 'cashier' && (!user.registerId || user.registerId !== (snap.data()?.registerId || snap.data()?.registerName))) return json({ session: null, businessName: business.data()?.name || 'Mi negocio' });
    const active = snap.exists && snap.data().ownerId === user.businessId && snap.data().status === 'open' ? { id: snap.id, ...snap.data() } : null;
    const session = user.role === 'cashier' && !(user.permissions?.manageCash === true && user.registerId) && active ? { id: active.id, businessName: active.businessName, registerId: active.registerId || active.registerName, registerName: active.registerName, openedAt: active.openedAt, salesCount: active.salesCount, status: active.status } : active;
    return json({ session, businessName: business.data()?.name || 'Mi negocio' });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner' && !(user.role === 'cashier' && user.permissions?.manageCash === true && user.registerId)) return fail('No tenés permiso para abrir la caja.', 403);
    const body = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos de apertura inválidos.');
    const openingAmount = Number(body.openingAmount);
    const registerName = user.role === 'cashier' ? user.registerId : String(body.registerName || 'Caja 1').trim();
    const businessName = user.role === 'cashier' ? null : String(body.businessName || 'Mi negocio').trim();
    if (!Number.isFinite(openingAmount) || openingAmount < 0 || openingAmount > 100000000 || registerName.length < 2 || registerName.length > 30 || (businessName !== null && (businessName.length < 2 || businessName.length > 60))) return fail('Revisá el fondo inicial y los nombres del negocio y la caja.');
    const businessRef = db().collection('businesses').doc(user.businessId);
    const sessionRef = db().collection('cashSessions').doc();
    const session = { ownerId: user.businessId, businessId: user.businessId, openedBy: user.uid, businessName, registerId: registerName, registerName, openingAmount: roundMoney(openingAmount), cashAdjustmentsTotal: 0, cashMovementsCount: 0, voidedTotal: 0, voidCount: 0, cashSalesTotal: 0, grossTotal: 0, salesCount: 0, status: 'open', openedAt: new Date().toISOString() };
    const opened = await db().runTransaction(async transaction => {
      const business = await transaction.get(businessRef);
      if (!business.exists || business.data().ownerId !== user.businessId) throw new Error('No encontramos el negocio activo.');
      if (user.role === 'cashier') {
        const employee = await transaction.get(businessRef.collection('cashiers').doc(user.uid));
        if (!employee.exists || employee.data().status !== 'active' || employee.data().registerId !== user.registerId || employee.data().permissions?.manageCash !== true) throw new Error('Sin permiso para operar esta caja.');
      }
      if (business.data()?.activeSessionId) return false;
      if (user.role === 'cashier') session.businessName = business.data().name || 'Mi negocio';
      transaction.set(sessionRef, session);
      transaction.set(businessRef, { ownerId: user.businessId, name: session.businessName, status: business.data()?.status || 'active', activeSessionId: sessionRef.id, nextReceiptNumber: business.data()?.nextReceiptNumber || 1, nextZNumber: business.data()?.nextZNumber || 1 }, { merge: true });
      return true;
    });
    if (!opened) return fail('Ya hay una caja abierta.', 409);
    return json({ session: { id: sessionRef.id, ...session } }, 201);
  } catch (error) { return error.message === 'Sin permiso para operar esta caja.' ? fail(error.message, 403) : safeError(error); }
}

export async function PATCH(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner' && !(user.role === 'cashier' && user.permissions?.manageCash === true && user.registerId)) return fail('No tenés permiso para cerrar la caja.', 403);
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
      if (user.role === 'cashier' && user.registerId !== (snap.data().registerId || snap.data().registerName)) return null;
      if (user.role === 'cashier') {
        const employee = await transaction.get(businessRef.collection('cashiers').doc(user.uid));
        if (!employee.exists || employee.data().status !== 'active' || employee.data().registerId !== user.registerId || employee.data().permissions?.manageCash !== true) throw new Error('Sin permiso para operar esta caja.');
      }
      const closedAt = new Date().toISOString();
      const businessDay = argentinaDay(closedAt);
      const salesSnap = await transaction.get(db().collection('sales').where('ownerId', '==', user.businessId));
      const returnsSnap = await transaction.get(db().collection('saleReturns').where('ownerId', '==', user.businessId));
      const paymentTotals = { cash: 0, card: 0, transfer: 0 };
      let netTotal = 0; let salesCount = 0; let voidCount = 0; let voidedTotal = 0; let creditTotal = 0;
      for (const saleDoc of salesSnap.docs) {
        const sale = saleDoc.data();
        if (argentinaDay(sale.createdAt) !== businessDay) continue;
        if (sale.status === 'voided') { voidCount++; voidedTotal = roundMoney(voidedTotal + sale.total); continue; }
        salesCount++; netTotal = roundMoney(netTotal + sale.total);
        for (const payment of sale.payments || [{ method: sale.paymentMethod, amount: sale.total }]) {
          if (payment.method in paymentTotals) paymentTotals[payment.method] = roundMoney(paymentTotals[payment.method] + payment.amount);
        }
      }
      for (const returnDoc of returnsSnap.docs) {
        const returned = returnDoc.data();
        if (argentinaDay(returned.createdAt) !== businessDay) continue;
        creditTotal = roundMoney(creditTotal + returned.amount);
        if (returned.method in paymentTotals) paymentTotals[returned.method] = roundMoney(paymentTotals[returned.method] - returned.amount);
      }
      netTotal = roundMoney(netTotal - creditTotal);
      const zNumber = business.data()?.nextZNumber || 1;
      const refundTotal = roundMoney(voidedTotal + creditTotal);
      const zReport = { businessDay, salesCount, voidCount, voidedTotal, paymentTotals, netTotal, creditTotal, refundTotal };
      const expectedClosingAmount = roundMoney(snap.data().openingAmount + snap.data().cashSalesTotal + (snap.data().cashAdjustmentsTotal || 0));
      const closed = { id, ...snap.data(), closingAmount: roundMoney(closingAmount), expectedClosingAmount, difference: roundMoney(closingAmount - expectedClosingAmount), paymentTotals, netTotal, creditTotal, refundTotal, zNumber, zReport, status: 'closed', closedAt, closedBy: user.uid };
      transaction.update(sessionRef, { closingAmount: closed.closingAmount, expectedClosingAmount, difference: closed.difference, paymentTotals, netTotal, creditTotal, refundTotal, zNumber, zReport, status: 'closed', closedAt, closedBy: user.uid });
      transaction.update(businessRef, { activeSessionId: null, nextZNumber: zNumber + 1 });
      return closed;
    });
    return closed ? json({ session: closed }) : fail('No hay una caja abierta.', 409);
  } catch (error) { return error.message === 'Sin permiso para operar esta caja.' ? fail(error.message, 403) : safeError(error); }
}
