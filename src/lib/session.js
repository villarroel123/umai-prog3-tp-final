import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, db } from './firebase-admin';

export async function sessionUser() {
  try {
    const value = (await cookies()).get('almacen_session')?.value;
    if (!value) return null;
    const token = await adminAuth().verifySessionCookie(value, true);
    const profile = await db().collection('users').doc(token.uid).get();
    return { uid: token.uid, email: token.email || '', name: profile.data()?.name || token.name || token.email?.split('@')[0] || 'Usuario', role: token.admin ? 'admin' : token.owner ? 'owner' : 'buyer' };
  } catch { return null; }
}

export function canManage(user) { return user && (user.role === 'owner' || user.role === 'admin'); }
