import { requireUser } from '@/lib/guard';
import { redirect } from 'next/navigation';
import PosWorkspace from '@/components/PosWorkspace';
export const metadata = { title: 'Caja' };
export default async function Page({ searchParams }) { const user = await requireUser('/caja', ['business_owner', 'cashier']); if (user.role === 'cashier' && user.permissions?.sell !== true) redirect('/caja/stock'); const full = (await searchParams)?.modo === 'cajero'; return <PosWorkspace cashier={user.role === 'cashier'} fullscreen={full} cashierName={user.name} manageCash={user.role === 'business_owner' || user.permissions?.manageCash === true} canAdjust={user.role === 'business_owner' || user.permissions?.adjustPrices === true} canReturn={user.role === 'business_owner' || user.permissions?.processReturns === true} assignedRegister={user.registerId}/>; }
