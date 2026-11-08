import { requireUser } from '@/lib/guard';
import PosWorkspace from '@/components/PosWorkspace';
export const metadata = { title: 'Caja' };
export default async function Page() { await requireUser('/caja', ['owner']); return <PosWorkspace/>; }
