import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { codeTaken, normalizeProduct } from '@/lib/product';
import { fail, json, safeError } from '@/lib/api';

export async function POST(_request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'owner') return fail('Sin permiso.', 403);
    const ref = db().collection('products').doc((await params).id);
    const snap = await ref.get();
    if (!snap.exists || snap.data().ownerId !== user.businessId) return fail('Producto no encontrado.', 404);
    if (!snap.data().archivedAt && snap.data().isActive !== false) return json({ product: normalizeProduct(snap.id, snap.data()) });
    const barcode = snap.data().barcode || snap.data().code;
    if (barcode && !barcode.startsWith('INT-') && await codeTaken(db(), user.businessId, barcode, snap.id)) return fail('Otro producto activo ya usa ese código de barras.', 409);
    const changes = { isActive: true, archivedAt: FieldValue.delete(), updatedAt: new Date().toISOString() };
    await ref.update(changes);
    return json({ product: normalizeProduct(snap.id, { ...snap.data(), isActive: true, archivedAt: null, updatedAt: changes.updatedAt }) });
  } catch (error) { return safeError(error); }
}
