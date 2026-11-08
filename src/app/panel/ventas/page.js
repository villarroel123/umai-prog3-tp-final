import SalesPage from '@/components/SalesPage';
export const metadata = { title: 'Ventas' };
export default function Page() { return <SalesPage detailBase="/panel/ventas" cashHref="/panel/nueva-venta"/>; }
