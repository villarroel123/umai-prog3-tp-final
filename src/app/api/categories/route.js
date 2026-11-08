import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { DEFAULT_CATEGORIES } from '@/lib/product';
import { fail, json, safeError } from '@/lib/api';

export async function GET() {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'owner') return fail('Sin permiso.', 403);
    const snapshot = await db().collection('categories').where('ownerId', '==', user.businessId).get();
    return json({ categories: [...DEFAULT_CATEGORIES, ...snapshot.docs.filter(doc => !doc.data().archivedAt).map(doc => ({ id: doc.id, name: doc.data().name, isDefault: false }))] });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'owner') return fail('Sin permiso.', 403);
    const { name: rawName } = await request.json();
    const name = String(rawName || '').trim();
    if (name.length < 2 || name.length > 40) return fail('El nombre debe tener entre 2 y 40 caracteres.');
    const database = db();
    const existing = await database.collection('categories').where('ownerId', '==', user.businessId).get();
    if ([...DEFAULT_CATEGORIES, ...existing.docs.filter(doc => !doc.data().archivedAt).map(doc => doc.data())].some(category => category.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) return fail('Ya existe una categoría con ese nombre.', 409);
    const now = new Date().toISOString();
    const ref = await database.collection('categories').add({ ownerId: user.businessId, businessId: user.businessId, name, createdAt: now, updatedAt: now });
    return json({ category: { id: ref.id, name, isDefault: false } }, 201);
  } catch (error) { return safeError(error); }
}
