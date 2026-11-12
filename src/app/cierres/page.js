import { requireUser } from '@/lib/guard';
import CashHistory from '@/components/CashHistory';

export const metadata = { title: 'Cierres de caja' };
export default async function Page() {
  await requireUser('/cierres', ['business_owner']);
  return <CashHistory/>;
}
