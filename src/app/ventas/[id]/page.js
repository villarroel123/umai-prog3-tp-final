import { requireUser } from '@/lib/guard';
import SaleDetail from '@/components/SaleDetail';
export const metadata = { title: 'Comprobante' };
export default async function Page({ params }) { await requireUser('/ventas', ['business_owner']); return <SaleDetail id={(await params).id} backHref="/ventas" canVoid/>; }
