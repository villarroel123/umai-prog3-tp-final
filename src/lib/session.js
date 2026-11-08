import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, db } from './firebase-admin';

export async function sessionUser() {
  try {
    const value = (await cookies()).get('caja_session')?.value;
    if (!value) return null;
    const token = await adminAuth().verifySessionCookie(value, true);
    const profile = await db().collection('users').doc(token.uid).get();
    const role = token.admin ? 'admin' : 'owner';
    let businessId = profile.data()?.businessId || token.uid;
    if (role === 'owner' && businessId !== token.uid) {
      const membership = await db().collection('businesses').doc(businessId).collection('members').doc(token.uid).get();
      if (!membership.exists || membership.data().status !== 'active') businessId = token.uid;
    }
    return { uid: token.uid, email: token.email || '', name: profile.data()?.name || token.name || token.email?.split('@')[0] || 'Usuario', role, businessId: role === 'owner' ? businessId : null };
  } catch { return null; }
}

export function canManage(user) { return user && (user.role === 'owner' || user.role === 'admin'); }
