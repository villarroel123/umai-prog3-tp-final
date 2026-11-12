import { requireUser } from '@/lib/guard';
import ReportsDashboard from '@/components/ReportsDashboard';

export const metadata = { title: 'Reportes' };
export default async function Page() {
  await requireUser('/reportes', ['business_owner']);
  return <ReportsDashboard/>;
}
