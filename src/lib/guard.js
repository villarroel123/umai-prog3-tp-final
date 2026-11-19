import { redirect } from 'next/navigation';
import { sessionUser } from './session';
import { landingFor } from './roles';
export async function requireUser(path, roles) { const user = await sessionUser({ allowPasswordChange: true }); if (!user) redirect(`/login?next=${encodeURIComponent(path)}`); if (user.requiresPasswordChange && path !== '/caja/cambiar-clave') redirect('/caja/cambiar-clave'); if (roles && !roles.includes(user.role)) redirect(landingFor(user.role)); return user; }
