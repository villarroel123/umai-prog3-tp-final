import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';
import { normalizedRole, ROLES } from '@/lib/roles';
import { identityForCashier } from '@/lib/cashier-server';

export async function GET() { return json({ user: await sessionUser({ allowPasswordChange: true }) }); }

export async function POST(request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) return fail('Falta el token de acceso.');
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    const authRecord = await adminAuth().getUser(decoded.uid);
    if (authRecord.disabled) return fail('Esta cuenta está suspendida.', 403);
    const ref = db().collection('users').doc(decoded.uid);
    const existing = await ref.get();
    if (['suspended', 'inactive'].includes(existing.data()?.status)) return fail('No se pudo iniciar sesión con estas credenciales.', 403);
    const name = authRecord.displayName || decoded.name || decoded.email?.split('@')[0] || 'Usuario';
    const storedRole = normalizedRole(existing.data()?.role);
    if (storedRole === ROLES.ADMIN && decoded.admin !== true) return fail('La cuenta administrativa requiere autorización del servidor.', 403);
    let role = decoded.admin === true ? ROLES.ADMIN : storedRole;
    let businessId = role === ROLES.ADMIN ? null : existing.data()?.businessId || null;
    if (role === ROLES.OWNER && !businessId) {
      const legacyBusiness = await db().collection('businesses').doc(decoded.uid).get();
      if (legacyBusiness.exists && legacyBusiness.data().ownerId === decoded.uid) businessId = decoded.uid;
    }
    let cashier = null;
    if (role === ROLES.CASHIER && !existing.exists) return fail('No se pudo iniciar sesión con estas credenciales.', 403);
    if (businessId) {
      const business = await db().collection('businesses').doc(businessId).get();
      if (!business.exists && role === ROLES.OWNER && businessId === decoded.uid) { role = null; businessId = null; }
      else if (!business.exists || business.data().status === 'suspended') return fail('El negocio no está disponible.', 403);
      if (businessId) {
      const membership = await business.ref.collection('members').doc(decoded.uid).get();
      const founder = role === ROLES.OWNER && business.data().ownerId === decoded.uid && !membership.exists;
      if (!founder && (!membership.exists || membership.data().status !== 'active' || normalizedRole(membership.data().role || 'owner') !== role)) return fail('No tenés acceso activo a este negocio.', 403);
      if (role === ROLES.CASHIER) {
        const employee = await business.ref.collection('cashiers').doc(decoded.uid).get();
        if (!employee.exists || employee.data().status !== 'active' || employee.data().businessId !== businessId) return fail('No se pudo iniciar sesión con estas credenciales.', 403);
        cashier = employee.data();
      }
      }
    }
    if (role === ROLES.CASHIER && !businessId) return fail('No se pudo iniciar sesión con estas credenciales.', 403);
    if (role === ROLES.CASHIER && authRecord.email !== identityForCashier(businessId, cashier.usernameNormalized)) return fail('No se pudo iniciar sesión con estas credenciales.', 403);
    if (!existing.exists) {
      await ref.set({ uid: decoded.uid, email: decoded.email?.toLowerCase() || '', name, role, businessId, status: 'active', createdAt: new Date().toISOString() });
    } else if (role !== ROLES.CASHIER) {
      await ref.update({ email: decoded.email?.toLowerCase() || '', name, role, businessId });
    }
    if (role === ROLES.CASHIER) await db().collection('businesses').doc(businessId).collection('cashiers').doc(decoded.uid).update({ lastAccessAt: new Date().toISOString() });
    const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 5 * 1000 });
    const response = NextResponse.json({ user: { uid: decoded.uid, email: role === ROLES.CASHIER ? '' : decoded.email || '', name: cashier?.name || name, role, businessId, requiresPasswordChange: role === ROLES.CASHIER && (cashier.requiresPasswordChange === true || existing.data()?.requiresPasswordChange === true), registerId: cashier?.registerId || null, permissions: cashier?.permissions || null } });
    response.cookies.set('caja_session', cookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 5 });
    return response;
  } catch (error) { return safeError(error); }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('caja_session', '', { path: '/', maxAge: 0 });
  return response;
}
