import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';
import { normalizedRole } from '@/lib/roles';

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (user.role === 'platform_admin') {
      const snap = await db().collection('users').get();
      return json({ users: snap.docs.map(doc => ({ uid: doc.id, name: doc.data().name || '', email: doc.data().email || '', role: normalizedRole(doc.data().role), businessId: doc.data().businessId || null, status: doc.data().status || 'active', createdAt: doc.data().createdAt || null })) });
    }
    const snap = await db().collection('users').doc(user.uid).get();
    return json({ user: snap.data() ? { uid: user.uid, name: user.name, email: user.email, role: user.role, businessId: user.businessId, status: user.status } : null });
  } catch (error) { return safeError(error); }
}

