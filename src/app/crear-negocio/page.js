import { requireUser } from '@/lib/guard';
import { redirect } from 'next/navigation';
import { landingFor } from '@/lib/roles';
import CreateBusiness from '@/components/CreateBusiness';

export const metadata = { title: 'Crear negocio' };
export default async function Page() {
  const user = await requireUser('/crear-negocio');
  if (user.role) redirect(landingFor(user.role));
  return <CreateBusiness/>;
}
