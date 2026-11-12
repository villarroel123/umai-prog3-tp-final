import { requireUser } from '@/lib/guard';
import AdminDashboard from '@/components/AdminDashboard';
export const metadata = { title: 'Administración' };
export default async function Page() { await requireUser('/admin', ['platform_admin']); return <AdminDashboard/>; }
