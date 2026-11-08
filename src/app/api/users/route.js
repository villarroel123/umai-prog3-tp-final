import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (user.role === 'admin') {
      const snap = await db().collection('users').get();
      return json({ users: snap.docs.map(doc => ({ ...doc.data(), role: doc.data().role === 'admin' ? 'admin' : 'owner' })) });
    }
    const snap = await db().collection('users').doc(user.uid).get();
    return json({ user: snap.data() ? { ...snap.data(), role: 'owner' } : null });
  } catch (error) { return safeError(error); }
}

