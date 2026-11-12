import { db } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/guard';
import BusinessDashboard from '@/components/BusinessDashboard';

export const metadata = { title: 'Resumen' };
export default async function Page() {
  const user = await requireUser('/panel', ['business_owner']);
  const business = await db().collection('businesses').doc(user.businessId).get();
  return <BusinessDashboard businessName={business.data()?.name || 'Mi negocio'} userName={user.name}/>;
}
