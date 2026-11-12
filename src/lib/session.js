import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, db } from './firebase-admin';
import { normalizedRole, ROLES } from './roles';

export async function sessionUser() {
  try {
    const value = (await cookies()).get('caja_session')?.value;
    if (!value) return null;
    const token = await adminAuth().verifySessionCookie(value, true);
    const profile = await db().collection('users').doc(token.uid).get();
    if (!profile.exists || profile.data()?.status === 'suspended' || token.disabled) return null;
    const data = profile.data();
    let role = token.admin === true ? ROLES.ADMIN : normalizedRole(data.role) === ROLES.ADMIN ? null : normalizedRole(data.role);
    if (role === null && normalizedRole(data.role) === ROLES.ADMIN) return null;
    let businessId = role === ROLES.ADMIN ? null : data.businessId || null;
    if (businessId) {
      const business = await db().collection('businesses').doc(businessId).get();
      if (!business.exists && role === ROLES.OWNER && businessId === token.uid) { role = null; businessId = null; }
      else if (!business.exists || business.data().status === 'suspended') return null;
      if (businessId) {
      const member = await business.ref.collection('members').doc(token.uid).get();
      const isFounder = role === ROLES.OWNER && business.data().ownerId === token.uid && !member.exists;
      if (!isFounder && (!member.exists || member.data().status !== 'active' || normalizedRole(member.data().role || 'owner') !== role)) return null;
      }
    }
    if (role === ROLES.CASHIER && !businessId) return null;
    return { uid: token.uid, email: token.email || '', name: data.name || token.name || token.email?.split('@')[0] || 'Usuario', role, businessId, status: data.status || 'active' };
  } catch { return null; }
}

export function canManage(user) { return user?.role === ROLES.OWNER; }
