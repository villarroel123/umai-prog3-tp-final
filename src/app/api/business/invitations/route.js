import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

export const tokenHash = token => createHash('sha256').update(token).digest('hex');

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'owner') return fail('Iniciá sesión como propietario.', 403);
    const email = String((await request.json()).email || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Ingresá un correo válido.');
    if (email === user.email.toLowerCase()) return fail('Ya pertenecés a este negocio.');
    const database = db();
    const businessRef = database.collection('businesses').doc(user.businessId);
    const business = await businessRef.get();
    if (!business.exists) await businessRef.set({ ownerId: user.businessId, name: 'Mi negocio', activeSessionId: null, nextReceiptNumber: 1, createdAt: new Date().toISOString() });
    await businessRef.collection('members').doc(user.uid).set({ email: user.email.toLowerCase(), name: user.name, status: 'active', joinedAt: new Date().toISOString() }, { merge: true });
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    await database.collection('businessInvitations').doc(tokenHash(token)).create({ businessId: user.businessId, email, invitedBy: user.uid, invitedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' });
    const origin = new URL(request.url).origin;
    return json({ invitationUrl: `${origin}/unirse?token=${token}`, email, expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() }, 201);
  } catch (error) { return safeError(error); }
}
