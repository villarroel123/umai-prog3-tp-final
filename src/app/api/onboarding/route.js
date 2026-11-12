import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { ROLES } from '@/lib/roles';
import { fail, json, safeError } from '@/lib/api';

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión para crear tu negocio.', 401);
    if (user.role === ROLES.ADMIN || user.role === ROLES.CASHIER || user.businessId) return fail('Esta cuenta ya tiene un acceso asignado.', 403);
    const name = String((await request.json()).name || '').trim();
    if (name.length < 2 || name.length > 60) return fail('El nombre del negocio debe tener entre 2 y 60 caracteres.');
    const database = db();
    const businessRef = database.collection('businesses').doc(user.uid);
    const profileRef = database.collection('users').doc(user.uid);
    const memberRef = businessRef.collection('members').doc(user.uid);
    await database.runTransaction(async transaction => {
      const [business, profile] = await Promise.all([transaction.get(businessRef), transaction.get(profileRef)]);
      if (business.exists || !profile.exists || profile.data().businessId || profile.data().status === 'suspended') throw new Error('La cuenta ya tiene un negocio o no está disponible.');
      const now = new Date().toISOString();
      transaction.create(businessRef, { ownerId: user.uid, name, status: 'active', activeSessionId: null, nextReceiptNumber: 1, createdAt: now, updatedAt: now });
      transaction.set(memberRef, { userId: user.uid, businessId: user.uid, email: user.email.toLowerCase(), name: user.name, role: ROLES.OWNER, status: 'active', joinedAt: now });
      transaction.update(profileRef, { role: ROLES.OWNER, businessId: user.uid });
    });
    return json({ businessId: user.uid, name }, 201);
  } catch (error) {
    if (error.message === 'La cuenta ya tiene un negocio o no está disponible.') return fail(error.message, 409);
    return safeError(error);
  }
}
