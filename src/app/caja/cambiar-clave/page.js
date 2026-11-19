import { requireUser } from '@/lib/guard';
import CashierPasswordChange from '@/components/CashierPasswordChange';

export const metadata = { title: 'Cambiar contraseña' };

export default async function Page() {
  await requireUser('/caja/cambiar-clave', ['cashier']);
  return <CashierPasswordChange/>;
}
