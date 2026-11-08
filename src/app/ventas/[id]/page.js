import { requireUser } from '@/lib/guard';
import SaleDetail from '@/components/SaleDetail';
export const metadata = { title: 'Comprobante' };
export default async function Page({ params }) { const user = await requireUser('/ventas', ['owner', 'admin']); return <SaleDetail id={(await params).id} backHref="/ventas" canVoid={user.role === 'owner'}/>; }
