import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'owner') return fail('Iniciá sesión como propietario.', 403);
    const database = db();
    const business = await database.collection('businesses').doc(user.businessId).get();
    const [members, invitations] = await Promise.all([
      database.collection('businesses').doc(user.businessId).collection('members').get(),
      database.collection('businessInvitations').where('businessId', '==', user.businessId).get(),
    ]);
    return json({ business: { id: user.businessId, name: business.data()?.name || 'Mi negocio' }, members: members.docs.filter(doc => doc.data().status === 'active').map(doc => ({ uid: doc.id, ...doc.data() })), invitations: invitations.docs.filter(doc => doc.data().status === 'pending' && new Date(doc.data().expiresAt) > new Date()).map(doc => ({ email: doc.data().email, expiresAt: doc.data().expiresAt, invitedAt: doc.data().invitedAt })) });
  } catch (error) { return safeError(error); }
}

export async function PATCH(request) {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'owner') return fail('Iniciá sesión como propietario.', 403);
    const name = String((await request.json()).name || '').trim();
    if (name.length < 2 || name.length > 60) return fail('El nombre debe tener entre 2 y 60 caracteres.');
    await db().collection('businesses').doc(user.businessId).set({ ownerId: user.businessId, name, updatedAt: new Date().toISOString() }, { merge: true });
    return json({ name });
  } catch (error) { return safeError(error); }
}
