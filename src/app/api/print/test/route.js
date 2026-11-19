import { sessionUser } from '@/lib/session';
import { imprimirPrueba } from '@/lib/impresion';
import { fail, json } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST() {
  const user = await sessionUser();
  if (!user) return fail('Iniciá sesión.', 401);
  if (user.role !== 'business_owner') return fail('Solo el propietario puede probar la impresora.', 403);
  try {
    await imprimirPrueba();
    return json({ printed: true });
  } catch {
    return fail('No se pudo imprimir la prueba. Revisá la conexión y la configuración.', 502);
  }
}
