import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

export async function GET() { return json({ user: await sessionUser() }); }

export async function POST(request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) return fail('Falta el token de acceso.');
    const decoded = await adminAuth().verifyIdToken(idToken);
    const authRecord = await adminAuth().getUser(decoded.uid);
    const role = decoded.admin ? 'admin' : decoded.owner ? 'owner' : 'buyer';
    const ref = db().collection('users').doc(decoded.uid);
    const existing = await ref.get();
    const name = authRecord.displayName || decoded.name || decoded.email?.split('@')[0] || 'Usuario';
    if (!existing.exists) {
      await ref.set({ uid: decoded.uid, email: decoded.email || '', name, role, ownerStatus: role === 'owner' ? 'approved' : 'none', createdAt: new Date().toISOString() });
    } else {
      await ref.update({ email: decoded.email || '', name, role, ...(role === 'owner' ? { ownerStatus: 'approved' } : {}) });
    }
    const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 5 * 1000 });
    const response = NextResponse.json({ user: { uid: decoded.uid, email: decoded.email || '', name, role } });
    response.cookies.set('almacen_session', cookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 5 });
    return response;
  } catch (error) { return safeError(error); }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('almacen_session', '', { path: '/', maxAge: 0 });
  return response;
}
