import { sessionUser } from '@/lib/session';
import { imprimirPrueba } from '@/lib/impresion';
import { fail, json } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST() {
  const user = await sessionUser();
  if (!user) return fail('IniciÃ¡ sesiÃ³n.', 401);
  if (user.role !== 'business_owner') return fail('Solo el propietario puede probar la impresora.', 403);
  try {
    await imprimirPrueba();
    return json({ printed: true });
  } catch {
    return fail('No se pudo imprimir la prueba. RevisÃ¡ la conexiÃ³n y la configuraciÃ³n.', 502);
  }
}
