import { adminAuth, db } from '@/lib/firebase-admin';
import { fail, json, safeError } from '@/lib/api';
import { cashierBusinessCode, validCashierUsername } from '@/lib/cashier-model';
import { identityEmail } from '@/lib/cashier-server';

const genericError = () => fail('No pudimos ingresar. Revisá el código del negocio, el usuario y la contraseña.', 401);

export async function POST(request) {
  try {
    const { businessCode, username, password } = await request.json();
    if (!/^[A-F0-9]{12}$/i.test(String(businessCode || '')) || !validCashierUsername(username) || typeof password !== 'string' || !password || password.length > 128) return genericError();
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new Error('Falta configurar Firebase Authentication.');
    const email = identityEmail(businessCode, username);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) return genericError();
    const identity = await response.json();
    if (!identity.localId) return genericError();
    const [authRecord, profile] = await Promise.all([adminAuth().getUser(identity.localId), db().collection('users').doc(identity.localId).get()]);
    if (authRecord.disabled || !profile.exists || profile.data().role !== 'cashier' || profile.data().status !== 'active' || authRecord.email !== email) return genericError();
    const businessId = profile.data().businessId;
    if (!businessId) return genericError();
    const business = await db().collection('businesses').doc(businessId).get();
    if (!business.exists || ['inactive', 'suspended'].includes(business.data().status) || cashierBusinessCode(businessId) !== String(businessCode).toUpperCase()) return genericError();
    const [employee, member] = await Promise.all([business.ref.collection('cashiers').doc(identity.localId).get(), business.ref.collection('members').doc(identity.localId).get()]);
    if (!employee.exists || employee.data().status !== 'active' || employee.data().businessId !== businessId || !member.exists || member.data().status !== 'active' || employee.data().usernameNormalized !== String(username).trim().toLowerCase()) return genericError();
    const token = await adminAuth().createCustomToken(identity.localId);
    const result = json({ token });
    result.headers.set('Cache-Control', 'no-store');
    return result;
  } catch (error) { return safeError(error); }
}
