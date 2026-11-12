import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

export async function POST(request, { params }) {
  try {
    const user = await sessionUser(); if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Sin permiso.', 403);
    const { newStock, reason } = await request.json();
    const amount = Number(newStock);
    const note = String(reason || '').trim();
    if (newStock === '' || newStock === null || newStock === undefined || !Number.isInteger(amount) || amount < 0 || amount > 1000000) return fail('Ingresá un stock entero válido.');
    if (note.length < 3 || note.length > 200) return fail('Explicá el motivo en 3 a 200 caracteres.');
    const database = db();
    const ref = database.collection('products').doc((await params).id);
    const movementRef = database.collection('inventoryMovements').doc();
    const movement = await database.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data().ownerId !== user.businessId || snap.data().archivedAt || snap.data().isActive === false) throw new Error('Producto no encontrado o archivado.');
      const previousStock = snap.data().stock;
      if (previousStock === amount) throw new Error('La nueva cantidad debe ser distinta de la actual.');
      const createdAt = new Date().toISOString();
      const data = { ownerId: user.businessId, businessId: user.businessId, productId: ref.id, productName: snap.data().name, previousStock, newStock: amount, delta: amount - previousStock, reason: note, actorId: user.uid, createdAt };
      transaction.update(ref, { stock: amount, updatedAt: createdAt });
      transaction.create(movementRef, data);
      return { id: movementRef.id, ...data };
    });
    return json({ movement }, 201);
  } catch (error) {
    if (['Producto no encontrado o archivado.', 'La nueva cantidad debe ser distinta de la actual.'].includes(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
