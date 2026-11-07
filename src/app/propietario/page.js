import { requireUser } from '@/lib/guard';
import OwnerDashboard from '@/components/OwnerDashboard';
export const metadata = { title: 'Mi negocio' };
export default async function Page() { const user = await requireUser('/propietario', ['owner', 'admin']); return <OwnerDashboard user={user}/>; }
