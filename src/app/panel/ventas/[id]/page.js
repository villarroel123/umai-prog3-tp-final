import SaleDetail from '@/components/SaleDetail';
export const metadata = { title: 'Detalle de venta' };
export default async function Page({ params }) { return <SaleDetail id={(await params).id} backHref="/panel/ventas" canVoid/>; }
