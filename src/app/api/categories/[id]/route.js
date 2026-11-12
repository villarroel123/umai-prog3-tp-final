import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { DEFAULT_CATEGORIES } from '@/lib/product';
import { fail, json, safeError } from '@/lib/api';

export async function PATCH(request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Sin permiso.', 403);
    const database = db();
    const ref = database.collection('categories').doc((await params).id);
    const [snap, allCategories] = await Promise.all([ref.get(), database.collection('categories').where('ownerId', '==', user.businessId).get()]);
    if (!snap.exists || snap.data().ownerId !== user.businessId || snap.data().archivedAt) return fail('Categoría no encontrada.', 404);
    const { name: rawName } = await request.json();
    const name = String(rawName || '').trim();
    if (name.length < 2 || name.length > 40) return fail('El nombre debe tener entre 2 y 40 caracteres.');
    if ([...DEFAULT_CATEGORIES, ...allCategories.docs.filter(doc => doc.id !== ref.id && !doc.data().archivedAt).map(doc => doc.data())].some(category => category.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) return fail('Ya existe una categoría con ese nombre.', 409);
    const products = await database.collection('products').where('ownerId', '==', user.businessId).get();
    const linked = products.docs.filter(doc => doc.data().categoryId === ref.id);
    if (linked.length > 450) return fail('Hay demasiados productos asociados para renombrar esta categoría en una operación.', 409);
    const now = new Date().toISOString();
    const batch = database.batch();
    batch.update(ref, { name, updatedAt: now });
    for (const product of linked) batch.update(product.ref, { category: name, updatedAt: now });
    await batch.commit();
    return json({ category: { id: ref.id, name, isDefault: false } });
  } catch (error) { return safeError(error); }
}

export async function DELETE(_request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Sin permiso.', 403);
    const database = db();
    const ref = database.collection('categories').doc((await params).id);
    const snap = await ref.get();
    if (!snap.exists || snap.data().ownerId !== user.businessId || snap.data().archivedAt) return fail('Categoría no encontrada.', 404);
    const products = await database.collection('products').where('ownerId', '==', user.businessId).get();
    if (products.docs.some(doc => doc.data().categoryId === ref.id)) return fail('Cambiá la categoría de los productos asociados antes de eliminarla.', 409);
    await ref.update({ archivedAt: new Date().toISOString() });
    return json({ ok: true });
  } catch (error) { return safeError(error); }
}
