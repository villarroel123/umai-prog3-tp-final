import SalesPage from '@/components/SalesPage';
export const metadata = { title: 'Ventas' };
export default function Page() { return <SalesPage detailBase="/negocio/ventas" cashHref="/negocio/nueva-venta"/>; }
