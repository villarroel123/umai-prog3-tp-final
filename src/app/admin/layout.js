import { requireUser } from '@/lib/guard';
export default async function Layout({ children }) { await requireUser('/admin', ['platform_admin']); return children; }
