import { requireUser } from '@/lib/guard';
import PosWorkspace from '@/components/PosWorkspace';
export const metadata = { title: 'Caja' };
export default async function Page() { const user = await requireUser('/caja', ['business_owner', 'cashier']); return <PosWorkspace cashier={user.role === 'cashier'}/>; }
