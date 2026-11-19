import { requireUser } from '@/lib/guard';
import { redirect } from 'next/navigation';
import CashierStock from '@/components/CashierStock';
export const metadata = { title: 'Consultar stock' };
export default async function Page() { const user = await requireUser('/caja/stock', ['cashier']); if (user.permissions?.viewStock !== true && user.permissions?.sell !== true) redirect('/caja/perfil'); return <CashierStock/>; }
