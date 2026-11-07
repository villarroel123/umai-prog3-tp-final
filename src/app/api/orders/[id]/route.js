import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { ORDER_STATUSES } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

export async function PATCH(request, { params }) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    const { id } = await params;
    const ref = db().collection('orders').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return fail('Pedido no encontrado.', 404);
    if (user.role !== 'admin' && (user.role !== 'owner' || snap.data().ownerId !== user.uid)) return fail('Sin permiso.', 403);
    const { status } = await request.json();
    if (!ORDER_STATUSES.includes(status)) return fail('Estado inválido.');
    await ref.update({ status });
    return json({ order: { id, ...snap.data(), status } });
  } catch (error) { return safeError(error); }
}
