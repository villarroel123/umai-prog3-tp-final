import 'server-only';
import { cashierBusinessCode, cashierIdentityEmail, normalizeCashierUsername, parseCashierPermissions, validCashierPassword, validCashierUsername } from './cashier-model';

export function identityEmail(code, username) {
  const secret = process.env.CASHIER_LOGIN_SECRET || process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!secret) throw new Error('Falta CASHIER_LOGIN_SECRET o FIREBASE_PRIVATE_KEY.');
  return cashierIdentityEmail(secret, code, username);
}

export function identityForCashier(businessId, username) {
  return identityEmail(cashierBusinessCode(businessId), username);
}

export function validateCashierInput(input, { passwordRequired = false } = {}) {
  const name = String(input?.name || '').trim();
  const username = normalizeCashierUsername(input?.username);
  const registerId = String(input?.registerId || '').trim();
  if (name.length < 2 || name.length > 80) throw new Error('El nombre debe tener entre 2 y 80 caracteres.');
  if (!validCashierUsername(username)) throw new Error('El usuario debe tener entre 3 y 24 caracteres: letras, números, punto, guion o guion bajo.');
  if (registerId.length > 30 || registerId.includes('/')) throw new Error('La caja asignada no es válida.');
  if (passwordRequired && !validCashierPassword(input?.password)) throw new Error('La contraseña debe tener entre 10 y 128 caracteres, con letras y números.');
  if (passwordRequired && input.password !== input.confirmPassword) throw new Error('Las contraseñas no coinciden.');
  const permissions = parseCashierPermissions(input?.permissions);
  if (permissions.manageCash && !permissions.sell) throw new Error('Para administrar su caja, el cajero debe poder registrar ventas.');
  if ((permissions.adjustPrices || permissions.processReturns) && !permissions.sell) throw new Error('Para ajustar precios o procesar devoluciones, el cajero debe poder registrar ventas.');
  if (permissions.manageCash && !registerId) throw new Error('Asigná una caja para autorizar aperturas, cierres y movimientos.');
  return { name, username, registerId: registerId || null, permissions };
}

export async function assertRegister(database, businessId, registerId) {
  if (!registerId) return;
  const ref = database.collection('businesses').doc(businessId).collection('registers').doc(registerId);
  const snap = await ref.get();
  if (snap.exists && !snap.data().archived) return;
  if (!snap.exists) {
    const sessions = await database.collection('cashSessions').where('ownerId', '==', businessId).where('registerName', '==', registerId).limit(1).get();
    if (!sessions.empty) return;
  }
  throw new Error('La caja asignada no existe o está archivada.');
}
