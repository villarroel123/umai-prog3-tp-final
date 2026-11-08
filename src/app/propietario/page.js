import { requireUser } from '@/lib/guard';
import OwnerDashboard from '@/components/OwnerDashboard';
export const metadata = { title: 'Mi negocio' };
export default async function Page() { await requireUser('/propietario', ['owner']); return <OwnerDashboard/>; }
