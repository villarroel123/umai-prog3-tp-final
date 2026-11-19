import { adminAuth, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';
import { validCashierPassword } from '@/lib/cashier-model';

export async function POST(request) {
  const user = await sessionUser({ allowPasswordChange: true });
  if (user?.role !== 'cashier') return fail('Sin permiso.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('Datos inválidos.'); }
  const { currentPassword, newPassword, confirmPassword } = body;
  if (!validCashierPassword(newPassword) || newPassword !== confirmPassword || newPassword === currentPassword) return fail('La nueva clave debe ser distinta, tener entre 10 y 128 caracteres, letras y números, y coincidir en ambos campos.');
  try {
    const record = await adminAuth().getUser(user.uid);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: record.email, password: currentPassword, returnSecureToken: true }), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) return fail('La contraseña actual es incorrecta.', 401);
    await adminAuth().updateUser(user.uid, { password: newPassword });
    await adminAuth().revokeRefreshTokens(user.uid);
    const batch = db().batch();
    batch.update(db().collection('users').doc(user.uid), { requiresPasswordChange: false });
    batch.update(db().collection('businesses').doc(user.businessId).collection('cashiers').doc(user.uid), { requiresPasswordChange: false, updatedAt: new Date().toISOString() });
    await batch.commit();
    const token = await adminAuth().createCustomToken(user.uid);
    const result = json({ ok: true, token });
    result.cookies.set('caja_session', '', { path: '/', maxAge: 0 });
    return result;
  } catch (error) { return safeError(error); }
}
