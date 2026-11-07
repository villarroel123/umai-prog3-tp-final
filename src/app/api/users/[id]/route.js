import { adminAuth, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

export async function PATCH(request, { params }) {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'admin') return fail('Sin permiso.', 403);
    const { id } = await params;
    if (id === user.uid) return fail('No podés cambiar tu propio rol.');
    const { role } = await request.json();
    if (!['buyer', 'owner'].includes(role)) return fail('Rol inválido.');
    const ref = db().collection('users').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return fail('Usuario no encontrado.', 404);
    await adminAuth().setCustomUserClaims(id, { owner: role === 'owner' });
    await ref.update({ role, ownerStatus: role === 'owner' ? 'approved' : 'none' });
    return json({ user: { ...snap.data(), role, ownerStatus: role === 'owner' ? 'approved' : 'none' } });
  } catch (error) { return safeError(error); }
}
