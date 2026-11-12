import OwnerDashboard from '@/components/OwnerDashboard';
export const metadata = { title: 'Productos' };
export default async function Page({ searchParams }) { return <OwnerDashboard openNew={(await searchParams)?.nuevo === '1'} cashHref="/negocio/nueva-venta"/>; }
