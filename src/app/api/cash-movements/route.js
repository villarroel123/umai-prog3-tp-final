import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { roundMoney } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

export async function GET(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Sin permiso.', 403);
    const id = new URL(request.url).searchParams.get('sessionId');
    if (!id || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return fail('Indicá una caja válida.');
    const session = await db().collection('cashSessions').doc(id).get();
    if (!session.exists || session.data().ownerId !== user.businessId) return fail('Sin permiso.', 403);
    const snap = await db().collection('cashMovements').where('cashSessionId', '==', id).get();
    return json({ movements: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Solo un propietario puede registrar movimientos.', 403);
    const body = await request.json();
    if (!body || typeof body !== 'object') return fail('Datos inválidos.');
    const type = body.type;
    const amount = roundMoney(Number(body.amount));
    const note = String(body.note || '').trim();
    const movementId = String(body.movementId || '');
    if (!['in', 'out'].includes(type) || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || note.length < 3 || note.length > 160 || !/^[0-9a-f-]{36}$/i.test(movementId)) return fail('Revisá el tipo, importe y motivo.');
    const database = db();
    const movementRef = database.collection('cashMovements').doc(movementId);
    const businessRef = database.collection('businesses').doc(user.businessId);
    const result = await database.runTransaction(async transaction => {
      const existing = await transaction.get(movementRef);
      if (existing.exists) return existing.data().ownerId === user.businessId ? { movement: { id: existing.id, ...existing.data() } } : null;
      const business = await transaction.get(businessRef);
      const sessionId = business.data()?.activeSessionId;
      if (!sessionId) throw new Error('Abrí la caja antes de registrar un movimiento.');
      const sessionRef = database.collection('cashSessions').doc(sessionId);
      const snap = await transaction.get(sessionRef);
      if (!snap.exists || snap.data().ownerId !== user.businessId || snap.data().status !== 'open') throw new Error('La caja activa no está disponible.');
      const signedAmount = type === 'in' ? amount : -amount;
      const nextAdjustments = roundMoney((snap.data().cashAdjustmentsTotal || 0) + signedAmount);
      const expectedCash = roundMoney(snap.data().openingAmount + snap.data().cashSalesTotal + nextAdjustments);
      if (expectedCash < 0) throw new Error('El retiro supera el efectivo esperado en caja.');
      const movement = { ownerId: user.businessId, businessId: user.businessId, actorId: user.uid, cashSessionId: sessionId, type, amount, note, createdAt: new Date().toISOString() };
      transaction.set(movementRef, movement);
      transaction.update(sessionRef, { cashAdjustmentsTotal: nextAdjustments, cashMovementsCount: (snap.data().cashMovementsCount || 0) + 1 });
      return { movement: { id: movementId, ...movement }, session: { id: sessionId, ...snap.data(), cashAdjustmentsTotal: nextAdjustments, cashMovementsCount: (snap.data().cashMovementsCount || 0) + 1 } };
    });
    if (!result) return fail('Movimiento inválido.', 409);
    return json(result, 201);
  } catch (error) {
    if (['Abrí la caja antes de registrar un movimiento.', 'La caja activa no está disponible.', 'El retiro supera el efectivo esperado en caja.'].includes(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
