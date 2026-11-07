import { requireUser } from '@/lib/guard';
import OrdersPage from '@/components/OrdersPage';
export const metadata = { title: 'Mis pedidos' };
export default async function Page() { await requireUser('/pedidos'); return <OrdersPage/>; }
