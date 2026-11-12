import { requireUser } from '@/lib/guard';
import SalesPage from '@/components/SalesPage';
export const metadata = { title: 'Ventas' };
export default async function Page() { await requireUser('/ventas', ['business_owner']); return <SalesPage/>; }
