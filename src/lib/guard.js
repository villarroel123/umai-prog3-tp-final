import { redirect } from 'next/navigation';
import { sessionUser } from './session';
export async function requireUser(path, roles) { const user = await sessionUser(); if (!user) redirect(`/login?next=${encodeURIComponent(path)}`); if (roles && !roles.includes(user.role)) redirect('/cuenta'); return user; }
