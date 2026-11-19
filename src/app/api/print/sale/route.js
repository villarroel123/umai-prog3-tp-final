import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { imprimirTicket } from '@/lib/impresion';
import { fail, json } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST(request) {
  const user = await sessionUser();
  if (!user) return fail('Iniciá sesión.', 401);
  const { saleId } = await request.json().catch(() => ({}));
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(String(saleId || ''))) return fail('Indicá una venta válida.');

  const database = db();
  const saleRef = database.collection('sales').doc(saleId);
  const snap = await saleRef.get();
  if (!snap.exists || snap.data().ownerId !== user.businessId || (user.role === 'cashier' && snap.data().cashierId !== user.uid)) return fail('Sin permiso para imprimir esta venta.', 403);
  const jobRef = database.collection('printJobs').doc(`${saleId}_receipt`);
  try {
    await imprimirTicket({ id: snap.id, ...snap.data() });
    const printedAt = new Date().toISOString();
    await jobRef.set({ ownerId: user.businessId, documentId: saleId, type: 'receipt', status: 'printed', printedAt, error: null }, { merge: true });
    return json({ printed: true, printedAt });
  } catch (error) {
    await jobRef.set({ ownerId: user.businessId, documentId: saleId, type: 'receipt', status: 'error', attemptedAt: new Date().toISOString(), error: String(error?.message || error).slice(0, 500) }, { merge: true });
    return fail('La venta se guardó, pero falló la impresión. Podés reimprimir el ticket.', 502);
  }
}
