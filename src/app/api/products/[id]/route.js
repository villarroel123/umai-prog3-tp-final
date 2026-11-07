import { adminConfigured, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { CATEGORIES, DEMO_PRODUCTS } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    if (!adminConfigured) {
      const product = DEMO_PRODUCTS.find(item => item.id === id);
      return product ? json({ product, demo: true }) : fail('Producto no encontrado.', 404);
    }
    const snap = await db().collection('products').doc(id).get();
    return snap.exists ? json({ product: { id: snap.id, ...snap.data() } }) : fail('Producto no encontrado.', 404);
  } catch (error) { return safeError(error); }
}

export async function PATCH(request, { params }) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    const { id } = await params;
    const ref = db().collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return fail('Producto no encontrado.', 404);
    if (user.role !== 'admin' && (user.role !== 'owner' || snap.data().ownerId !== user.uid)) return fail('Sin permiso.', 403);
    const body = await request.json();
    const allowed = ['name', 'description', 'category', 'price', 'stock', 'unit', 'featured'];
    const changes = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
    if ('name' in changes && (typeof changes.name !== 'string' || changes.name.trim().length < 3 || changes.name.length > 80)) return fail('Nombre inválido.');
    if ('description' in changes && (typeof changes.description !== 'string' || changes.description.length > 400)) return fail('Descripción inválida.');
    if ('category' in changes && !CATEGORIES.includes(changes.category)) return fail('Categoría inválida.');
    if ('price' in changes && (!Number.isFinite(Number(changes.price)) || Number(changes.price) <= 0)) return fail('Precio inválido.');
    if ('stock' in changes && (!Number.isInteger(Number(changes.stock)) || Number(changes.stock) < 0)) return fail('Stock inválido.');
    if ('unit' in changes && (typeof changes.unit !== 'string' || !changes.unit.trim() || changes.unit.length > 30)) return fail('Unidad inválida.');
    if ('featured' in changes && typeof changes.featured !== 'boolean') return fail('Valor destacado inválido.');
    if ('price' in changes) changes.price = Number(changes.price);
    if ('stock' in changes) changes.stock = Number(changes.stock);
    changes.updatedAt = new Date().toISOString();
    await ref.update(changes);
    return json({ product: { id, ...snap.data(), ...changes } });
  } catch (error) { return safeError(error); }
}

export async function DELETE(_request, { params }) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    const { id } = await params;
    const ref = db().collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return fail('Producto no encontrado.', 404);
    if (user.role !== 'admin' && (user.role !== 'owner' || snap.data().ownerId !== user.uid)) return fail('Sin permiso.', 403);
    await ref.delete();
    return json({ ok: true });
  } catch (error) { return safeError(error); }
}
