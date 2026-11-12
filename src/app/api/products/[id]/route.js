import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { codeTaken, normalizeProduct, parseProduct, resolveCategory } from '@/lib/product';
import { fail, json, safeError } from '@/lib/api';

async function findAuthorized(id, user, mutate = false) {
  if (mutate && user.role !== 'business_owner') return { error: fail('Solo un propietario puede modificar productos.', 403) };
  const ref = db().collection('products').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { error: fail('Producto no encontrado.', 404) };
  if (!['business_owner', 'cashier'].includes(user.role) || snap.data().ownerId !== user.businessId) return { error: fail('Sin permiso.', 403) };
  return { ref, snap };
}

export async function GET(_request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    const result = await findAuthorized((await params).id, user);
    return result.error || json({ product: normalizeProduct(result.snap.id, result.snap.data()) });
  } catch (error) { return safeError(error); }
}

export async function PATCH(request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    const result = await findAuthorized((await params).id, user, true); if (result.error) return result.error;
    const previous = normalizeProduct(result.snap.id, result.snap.data());
    let product;
    try { product = parseProduct({ ...previous, ...await request.json() }); } catch (error) { return fail(error.message); }
    if (product.stock !== previous.stock) return fail('Usá Ajustar stock para registrar el motivo del cambio.');
    let category;
    try { category = await resolveCategory(db(), user.businessId, product.categoryId, previous.category); } catch (error) { return fail(error.message); }
    if (product.barcode && await codeTaken(db(), user.businessId, product.barcode, result.snap.id)) return fail('Ya existe un producto con ese código de barras.', 409);
    const changes = {
      ...product, code: product.barcode || `INT-${result.snap.id.slice(0, 12)}`,
      categoryId: category.id, category: category.name,
      price: product.salePrice, updatedAt: new Date().toISOString(),
    };
    delete changes.stock;
    await result.ref.update(changes);
    return json({ product: normalizeProduct(result.snap.id, { ...result.snap.data(), ...changes }) });
  } catch (error) { return safeError(error); }
}

export async function DELETE(_request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    const result = await findAuthorized((await params).id, user, true); if (result.error) return result.error;
    if (result.snap.data().archivedAt || result.snap.data().isActive === false) return json({ ok: true });
    const now = new Date().toISOString();
    await result.ref.update({ isActive: false, archivedAt: now, updatedAt: now });
    return json({ ok: true });
  } catch (error) { return safeError(error); }
}
