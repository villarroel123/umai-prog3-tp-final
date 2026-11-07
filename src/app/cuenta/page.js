import { requireUser } from '@/lib/guard';
import AccountPage from '@/components/AccountPage';
export const metadata = { title: 'Mi cuenta' };
export default async function Page() { const user = await requireUser('/cuenta'); return <AccountPage initialUser={user}/>; }
