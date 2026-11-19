import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { imprimirCierreZ } from '@/lib/impresion';
import { fail, json } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST(request) {
  const user = await sessionUser();
  if (!user) return fail('IniciÃ¡ sesiÃ³n.', 401);
  if (user.role !== 'business_owner') return fail('Solo el propietario puede imprimir cierres Z.', 403);
  const { sessionId } = await request.json().catch(() => ({}));
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(String(sessionId || ''))) return fail('IndicÃ¡ un cierre vÃ¡lido.');

  const database = db();
  const ref = database.collection('cashSessions').doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerId !== user.businessId || snap.data().status !== 'closed') return fail('No encontramos un cierre Z para imprimir.', 404);
  const jobRef = database.collection('printJobs').doc(`${sessionId}_z`);
  const session = { id: snap.id, ...snap.data() };
  try {
    await imprimirCierreZ(session);
    const printedAt = new Date().toISOString();
    await jobRef.set({ ownerId: user.businessId, documentId: sessionId, type: 'z-report', status: 'printed', printedAt, error: null }, { merge: true });
    return json({ printed: true, printedAt });
  } catch (error) {
    await jobRef.set({ ownerId: user.businessId, documentId: sessionId, type: 'z-report', status: 'error', attemptedAt: new Date().toISOString(), error: String(error?.message || error).slice(0, 500) }, { merge: true });
    return fail('El cierre Z se guardÃ³, pero fallÃ³ la impresiÃ³n. PodÃ©s reimprimirlo.', 502);
  }
}
