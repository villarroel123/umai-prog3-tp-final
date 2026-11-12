import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { codeTaken, normalizeProduct, parseProduct, resolveCategory } from '@/lib/product';
import { fail, json, safeError } from '@/lib/api';

export async function GET(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (!['business_owner', 'cashier'].includes(user.role)) return fail('Sin permiso.', 403);
    const url = new URL(request.url);
    const requestedOwner = url.searchParams.get('owner');
    if (requestedOwner && requestedOwner !== user.businessId) return fail('Sin permiso.', 403);
    const query = db().collection('products').where('ownerId', '==', user.businessId);
    const snapshot = await query.get();
    const includeArchived = url.searchParams.get('includeArchived') === '1' && user.role === 'business_owner';
    return json({ products: snapshot.docs.map(doc => normalizeProduct(doc.id, doc.data())).filter(product => includeArchived || product.isActive).sort((a, b) => a.name.localeCompare(b.name, 'es')) });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Solo un propietario puede cargar productos.', 403);
    const database = db();
    const ref = database.collection('products').doc();
    let product;
    try { product = parseProduct(await request.json()); } catch (error) { return fail(error.message); }
    let category;
    try { category = await resolveCategory(database, user.businessId, product.categoryId); } catch (error) { return fail(error.message); }
    if (product.barcode && await codeTaken(database, user.businessId, product.barcode)) return fail('Ya existe un producto con ese código de barras.', 409);
    const code = product.barcode || `INT-${ref.id.slice(0, 12)}`;
    const now = new Date().toISOString();
    const data = {
      ...product, code, categoryId: category.id, category: category.name,
      imageUrl: product.imageUrl,
      price: product.salePrice, ownerId: user.businessId, businessId: user.businessId,
      isActive: true, isSample: false, createdAt: now, updatedAt: now,
    };
    await ref.create(data);
    return json({ product: normalizeProduct(ref.id, data) }, 201);
  } catch (error) { return safeError(error); }
}
