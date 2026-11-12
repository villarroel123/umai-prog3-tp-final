import { db } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/guard';
import PanelShell from '@/components/PanelShell';

export default async function Layout({ children }) {
  const user = await requireUser('/negocio', ['business_owner']);
  const business = await db().collection('businesses').doc(user.businessId).get();
  return <PanelShell user={user} businessName={business.data()?.name || 'Mi negocio'} basePath="/negocio">{children}</PanelShell>;
}
