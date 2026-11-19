import { adminAuth, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';
import { cashierBusinessCode } from '@/lib/cashier-model';
import { assertRegister, identityForCashier, validateCashierInput } from '@/lib/cashier-server';

export async function GET() {
  try {
    const owner = await sessionUser();
    if (owner?.role !== 'business_owner') return fail('Sin permiso.', 403);
    const snapshot = await db().collection('businesses').doc(owner.businessId).collection('cashiers').get();
    const cashiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return json({ businessCode: cashierBusinessCode(owner.businessId), cashiers });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  const owner = await sessionUser();
  if (owner?.role !== 'business_owner') return fail('Sin permiso.', 403);
  let input, body;
  try { body = await request.json(); input = validateCashierInput(body, { passwordRequired: true }); }
  catch (error) { return fail(error.message); }
  const database = db();
  let authRecord;
  try {
    await assertRegister(database, owner.businessId, input.registerId);
    authRecord = await adminAuth().createUser({ email: identityForCashier(owner.businessId, input.username), password: body.password, displayName: input.name, emailVerified: false });
    const now = new Date().toISOString();
    const businessRef = database.collection('businesses').doc(owner.businessId);
    const cashierRef = businessRef.collection('cashiers').doc(authRecord.uid);
    const usernameRef = businessRef.collection('cashierUsernames').doc(input.username);
    const profileRef = database.collection('users').doc(authRecord.uid);
    const cashier = { uid: authRecord.uid, businessId: owner.businessId, name: input.name, username: input.username, usernameNormalized: input.username, role: 'cashier', registerId: input.registerId, status: 'active', permissions: input.permissions, priceAuthorizedBy: input.permissions.adjustPrices ? owner.uid : null, returnsAuthorizedBy: input.permissions.processReturns ? owner.uid : null, requiresPasswordChange: true, createdAt: now, updatedAt: now, lastAccessAt: null };
    await database.runTransaction(async transaction => {
      const existing = await transaction.get(usernameRef);
      if (existing.exists) throw new Error('Ya existe un cajero con ese nombre de usuario.');
      transaction.create(usernameRef, { uid: authRecord.uid, createdAt: now });
      transaction.create(cashierRef, cashier);
      transaction.create(profileRef, { uid: authRecord.uid, email: authRecord.email, name: input.name, role: 'cashier', businessId: owner.businessId, status: 'active', requiresPasswordChange: true, createdAt: now });
      transaction.create(businessRef.collection('members').doc(authRecord.uid), { userId: authRecord.uid, businessId: owner.businessId, name: input.name, role: 'cashier', status: 'active', joinedAt: now });
    });
    return json({ cashier }, 201);
  } catch (error) {
    if (authRecord) await adminAuth().deleteUser(authRecord.uid).catch(cleanupError => console.error('No se pudo revertir la cuenta de Firebase Auth:', cleanupError));
    if (error.code === 'auth/email-already-exists' || /Ya existe un cajero/.test(error.message)) return fail('Ya existe un cajero con ese nombre de usuario.', 409);
    if (/caja asignada/i.test(error.message)) return fail(error.message);
    return safeError(error);
  }
}
