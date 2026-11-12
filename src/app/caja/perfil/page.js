import { requireUser } from '@/lib/guard';
import AccountPage from '@/components/AccountPage';
export const metadata = { title: 'Mi perfil' };
export default async function Page() { const user = await requireUser('/caja/perfil', ['cashier']); return <AccountPage initialUser={user}/>; }
