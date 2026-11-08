import { createHash } from 'node:crypto';
import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

const hash = token => createHash('sha256').update(token).digest('hex');
const validToken = token => /^[a-f0-9]{64}$/.test(token);

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    if (!validToken(token)) return fail('Invitación inválida.', 404);
    const invitation = await db().collection('businessInvitations').doc(hash(token)).get();
    if (!invitation.exists || invitation.data().status !== 'pending' || new Date(invitation.data().expiresAt) <= new Date()) return fail('La invitación venció o ya fue usada.', 404);
    const business = await db().collection('businesses').doc(invitation.data().businessId).get();
    return json({ businessName: business.data()?.name || 'Mi negocio', email: invitation.data().email, expiresAt: invitation.data().expiresAt });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'owner') return fail('Ingresá con la cuenta invitada.', 401);
    const token = String((await request.json()).token || '');
    if (!validToken(token)) return fail('Invitación inválida.');
    const database = db();
    const invitationRef = database.collection('businessInvitations').doc(hash(token));
    const profileRef = database.collection('users').doc(user.uid);
    const ownBusinessRef = database.collection('businesses').doc(user.uid);
    const result = await database.runTransaction(async transaction => {
      const [invitation, profile, ownBusiness] = await Promise.all([transaction.get(invitationRef), transaction.get(profileRef), transaction.get(ownBusinessRef)]);
      if (!invitation.exists || invitation.data().status !== 'pending' || new Date(invitation.data().expiresAt) <= new Date()) throw new Error('La invitación venció o ya fue usada.');
      if (invitation.data().email !== user.email.toLowerCase()) throw new Error('Ingresá con el correo al que se envió la invitación.');
      if (ownBusiness.exists && invitation.data().businessId !== user.uid) throw new Error('Esta cuenta ya tiene un negocio propio.');
      if (profile.data()?.businessId && profile.data().businessId !== user.uid && profile.data().businessId !== invitation.data().businessId) throw new Error('Esta cuenta ya pertenece a otro negocio.');
      const businessRef = database.collection('businesses').doc(invitation.data().businessId);
      const business = await transaction.get(businessRef);
      if (!business.exists) throw new Error('El negocio ya no está disponible.');
      transaction.set(businessRef.collection('members').doc(user.uid), { email: user.email.toLowerCase(), name: user.name, status: 'active', joinedAt: new Date().toISOString() });
      transaction.set(profileRef, { uid: user.uid, email: user.email.toLowerCase(), name: user.name, role: 'owner', businessId: businessRef.id }, { merge: true });
      transaction.update(invitationRef, { status: 'accepted', acceptedBy: user.uid, acceptedAt: new Date().toISOString() });
      return { businessId: businessRef.id, businessName: business.data().name || 'Mi negocio' };
    });
    return json(result);
  } catch (error) {
    if (/^(La invitación|Ingresá con el correo|Esta cuenta|El negocio)/.test(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
