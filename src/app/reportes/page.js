import { requireUser } from '@/lib/guard';
import ReportsDashboard from '@/components/ReportsDashboard';

export const metadata = { title: 'Reportes' };
export default async function Page() {
  const user = await requireUser('/reportes', ['owner', 'admin']);
  return <ReportsDashboard admin={user.role === 'admin'}/>;
}
