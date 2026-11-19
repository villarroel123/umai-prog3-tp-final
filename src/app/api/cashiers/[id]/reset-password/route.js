import { adminAuth, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';
import { validCashierPassword } from '@/lib/cashier-model';

export async function POST(request, { params }) {
  const owner = await sessionUser();
  if (owner?.role !== 'business_owner') return fail('Sin permiso.', 403);
  const { id } = await params;
  const ref = db().collection('businesses').doc(owner.businessId).collection('cashiers').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return fail('Cajero no encontrado.', 404);
  let body;
  try { body = await request.json(); } catch { return fail('Datos inválidos.'); }
  if (!validCashierPassword(body.password) || body.password !== body.confirmPassword) return fail('La clave temporal debe tener entre 10 y 128 caracteres, con letras y números, y coincidir en ambos campos.');
  try {
    await adminAuth().updateUser(id, { password: body.password });
    await adminAuth().revokeRefreshTokens(id);
    const batch = db().batch();
    batch.update(ref, { requiresPasswordChange: true, updatedAt: new Date().toISOString() });
    batch.update(db().collection('users').doc(id), { requiresPasswordChange: true });
    await batch.commit();
    return json({ ok: true });
  } catch (error) { return safeError(error); }
}
