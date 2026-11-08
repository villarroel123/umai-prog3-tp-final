import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { parseCheckout } from '@/lib/sale-checkout';
import { recordSale } from '@/lib/sale-service';
import { fail, json, safeError } from '@/lib/api';

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    const collection = db().collection('sales');
    const query = user.role === 'admin' ? collection : collection.where('ownerId', '==', user.businessId);
    const snap = await query.get();
    return json({ sales: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'owner') return fail('Solo un propietario puede registrar cobros.', 403);
    let checkout;
    try { checkout = parseCheckout(await request.json()); }
    catch (error) { return fail(error.message); }
    const sale = await recordSale(db(), user, checkout);
    return json({ sale }, 201);
  } catch (error) {
    if (/^(Esta solicitud de cobro|No encontramos el negocio|Abrí la caja|La caja activa|Uno de los productos|Precio inválido|Stock insuficiente|El total de la venta|Los pagos deben sumar|No se pudo generar el número)/.test(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
