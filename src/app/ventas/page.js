import { requireUser } from '@/lib/guard';
import SalesPage from '@/components/SalesPage';
export const metadata = { title: 'Ventas' };
export default async function Page() { const user = await requireUser('/ventas', ['owner', 'admin']); return <SalesPage admin={user.role === 'admin'}/>; }
