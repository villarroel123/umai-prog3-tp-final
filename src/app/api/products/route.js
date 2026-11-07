import { adminConfigured, db } from '@/lib/firebase-admin';
import { canManage, sessionUser } from '@/lib/session';
import { CATEGORIES, DEMO_PRODUCTS } from '@/lib/models';
import { fail, json, safeError } from '@/lib/api';

export async function GET(request) {
  try {
    if (!adminConfigured) return json({ products: DEMO_PRODUCTS, demo: true });
    const owner = new URL(request.url).searchParams.get('owner');
    const user = await sessionUser();
    if (owner && (!user || (user.role !== 'admin' && user.uid !== owner))) return fail('Sin permiso.', 403);
    const query = owner ? db().collection('products').where('ownerId', '==', owner) : db().collection('products');
    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ products, demo: false });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (!canManage(user)) return fail('Sin permiso.', 403);
    const body = await request.json();
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const category = String(body.category || '');
    const price = Number(body.price);
    const stock = Number(body.stock);
    const unit = String(body.unit || '').trim();
    if (name.length < 3 || name.length > 80 || description.length > 400 || !CATEGORIES.includes(category) || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0 || !unit || unit.length > 30) return fail('Revisá los datos del producto.');
    const now = new Date().toISOString();
    const product = { name, description, category, price, stock, unit, ownerId: user.uid, featured: Boolean(body.featured), createdAt: now, updatedAt: now };
    const ref = await db().collection('products').add(product);
    return json({ product: { id: ref.id, ...product } }, 201);
  } catch (error) { return safeError(error); }
}
