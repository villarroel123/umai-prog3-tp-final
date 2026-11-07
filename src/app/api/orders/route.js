import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    let query = db().collection('orders');
    if (user.role === 'owner') query = query.where('ownerId', '==', user.uid);
    if (user.role === 'buyer') query = query.where('buyerId', '==', user.uid);
    const snap = await query.get();
    return json({ orders: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión para finalizar tu compra.', 401);
    const { items } = await request.json();
    if (!Array.isArray(items) || !items.length || items.length > 50) return fail('El carrito está vacío o es demasiado grande.');
    const quantities = new Map();
    for (const item of items) {
      if (typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return fail('Cantidad inválida.');
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }
    if ([...quantities.values()].some(quantity => quantity > 99)) return fail('Cantidad inválida.');
    const refs = [...quantities.keys()].map(id => db().collection('products').doc(id));
    const checkoutGroupId = db().collection('orders').doc().id;
    const orders = await db().runTransaction(async transaction => {
      const snapshots = await transaction.getAll(...refs);
      const groups = new Map();
      snapshots.forEach((snap, index) => {
        if (!snap.exists) throw new Error('Un producto ya no está disponible.');
        const product = snap.data();
        const quantity = quantities.get(refs[index].id);
        if (product.stock < quantity) throw new Error(`No hay stock suficiente de ${product.name}.`);
        const item = { productId: snap.id, name: product.name, price: product.price, quantity, ownerId: product.ownerId, unit: product.unit };
        groups.set(product.ownerId, [...(groups.get(product.ownerId) || []), item]);
      });
      const now = new Date().toISOString();
      const created = [];
      groups.forEach((groupItems, ownerId) => {
        const ref = db().collection('orders').doc();
        const order = { buyerId: user.uid, buyerName: user.name, ownerId, items: groupItems, total: groupItems.reduce((sum, item) => sum + item.price * item.quantity, 0), status: 'placed', checkoutGroupId, createdAt: now };
        transaction.set(ref, order);
        created.push({ id: ref.id, ...order });
      });
      snapshots.forEach((snap, index) => transaction.update(refs[index], { stock: snap.data().stock - quantities.get(refs[index].id), updatedAt: now }));
      return created;
    });
    return json({ orders }, 201);
  } catch (error) {
    if (error.message?.startsWith('No hay stock') || error.message?.includes('ya no está disponible')) return fail(error.message, 409);
    return safeError(error);
  }
}
