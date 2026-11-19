import { adminAuth, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';
import { assertRegister, identityForCashier, validateCashierInput } from '@/lib/cashier-server';

export async function PATCH(request, { params }) {
  const owner = await sessionUser();
  if (owner?.role !== 'business_owner') return fail('Sin permiso.', 403);
  const { id } = await params;
  const database = db();
  const businessRef = database.collection('businesses').doc(owner.businessId);
  const cashierRef = businessRef.collection('cashiers').doc(id);
  const currentSnap = await cashierRef.get();
  if (!currentSnap.exists) return fail('Cajero no encontrado.', 404);
  const current = currentSnap.data();
  let body, input;
  try {
    body = await request.json();
    input = validateCashierInput({ ...current, ...body });
    await assertRegister(database, owner.businessId, input.registerId);
  } catch (error) { return fail(error.message); }
  const status = body.status === 'inactive' ? 'inactive' : body.status === 'active' || body.status == null ? body.status || current.status : null;
  if (!status) return fail('Estado inválido.');
  const profileRef = database.collection('users').doc(id);
  const memberRef = businessRef.collection('members').doc(id);
  const changedUsername = input.username !== current.usernameNormalized;
  let authUpdated = false;
  try {
    await adminAuth().updateUser(id, { email: identityForCashier(owner.businessId, input.username), displayName: input.name, disabled: status === 'inactive' });
    authUpdated = true;
    const now = new Date().toISOString();
    await database.runTransaction(async transaction => {
      const fresh = await transaction.get(cashierRef);
      if (!fresh.exists || fresh.data().usernameNormalized !== current.usernameNormalized) throw new Error('Los datos del cajero cambiaron. Recargá la lista.');
      const newUsernameRef = businessRef.collection('cashierUsernames').doc(input.username);
      if (changedUsername) {
        const reserved = await transaction.get(newUsernameRef);
        if (reserved.exists) throw new Error('Ya existe un cajero con ese nombre de usuario.');
        transaction.create(newUsernameRef, { uid: id, createdAt: now });
        transaction.delete(businessRef.collection('cashierUsernames').doc(current.usernameNormalized));
      }
      transaction.update(cashierRef, { name: input.name, username: input.username, usernameNormalized: input.username, registerId: input.registerId, status, permissions: input.permissions, priceAuthorizedBy: input.permissions.adjustPrices ? owner.uid : null, returnsAuthorizedBy: input.permissions.processReturns ? owner.uid : null, updatedAt: now });
      transaction.update(profileRef, { name: input.name, email: identityForCashier(owner.businessId, input.username), status });
      transaction.update(memberRef, { name: input.name, status });
    });
    if (status === 'inactive' || changedUsername) await adminAuth().revokeRefreshTokens(id).catch(error => console.error('No se pudo revocar el token del cajero:', error));
    return json({ cashier: { ...current, name: input.name, username: input.username, usernameNormalized: input.username, registerId: input.registerId, status, permissions: input.permissions, updatedAt: now } });
  } catch (error) {
    if (authUpdated) await adminAuth().updateUser(id, { email: identityForCashier(owner.businessId, current.usernameNormalized), displayName: current.name, disabled: current.status === 'inactive' }).catch(rollbackError => console.error('No se pudo revertir Auth:', rollbackError));
    if (/Ya existe un cajero|cambiaron/.test(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
