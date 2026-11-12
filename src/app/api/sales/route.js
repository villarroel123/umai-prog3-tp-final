import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { parseCheckout } from '@/lib/sale-checkout';
import { recordSale } from '@/lib/sale-service';
import { fail, json, safeError } from '@/lib/api';

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (!user.businessId || !['business_owner', 'cashier'].includes(user.role)) return fail('Sin permiso.', 403);
    const query = db().collection('sales').where('ownerId', '==', user.businessId);
    const snap = await query.get();
    return json({ sales: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(sale => user.role !== 'cashier' || sale.cashierId === user.uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error) { return safeError(error); }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (!['business_owner', 'cashier'].includes(user.role)) return fail('Sin permiso para cobrar.', 403);
    let checkout;
    try { checkout = parseCheckout(await request.json()); }
    catch (error) { return fail(error.message); }
    if (user.role === 'cashier' && (checkout.adjustment.type !== 'none' || [...checkout.requested.values()].some(item => item.adjustment.type !== 'none'))) return fail('Los ajustes de precio requieren autorización del jefe.', 403);
    const sale = await recordSale(db(), user, checkout);
    return json({ sale }, 201);
  } catch (error) {
    if (/^(Esta solicitud de cobro|No encontramos el negocio|Abrí la caja|La caja activa|Uno de los productos|Precio inválido|Stock insuficiente|El total de la venta|Los pagos deben sumar|No se pudo generar el número)/.test(error.message)) return fail(error.message, 409);
    return safeError(error);
  }
}
