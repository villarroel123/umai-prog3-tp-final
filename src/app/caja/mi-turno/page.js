import { requireUser } from '@/lib/guard';
import { redirect } from 'next/navigation';
import CashierShift from '@/components/CashierShift';
export const metadata = { title: 'Mi turno' };
export default async function Page() { const user = await requireUser('/caja/mi-turno', ['cashier']); if (user.permissions?.sell !== true) redirect('/caja/stock'); return <CashierShift/>; }
