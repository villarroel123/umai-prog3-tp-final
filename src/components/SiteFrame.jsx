'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { useStore } from '@/context/StoreContext';

export default function SiteFrame({ children }) {
  const pathname = usePathname();
  const { user } = useStore();
  if (pathname === '/caja' && user?.role === 'cashier') return children;
  if (pathname === '/caja-cobro' || pathname === '/panel' || pathname.startsWith('/panel/') || pathname === '/negocio' || pathname.startsWith('/negocio/')) return children;
  const privateSections = [
    ['/admin/usuarios', 'Usuarios'], ['/admin/negocios', 'Negocios'], ['/admin/soporte', 'Soporte'], ['/admin/configuracion', 'Configuración'], ['/admin', 'Administración'],
    ['/caja/cambiar-clave', 'Cambiar contraseña'], ['/caja/mi-turno', 'Mi turno'], ['/caja/stock', 'Consultar stock'], ['/caja/perfil', 'Mi perfil'], ['/caja', 'Caja'],
    ['/ventas', 'Ventas'], ['/cierres', 'Cierres de caja'], ['/reportes', 'Reportes'], ['/cuenta', 'Mi cuenta'],
  ];
  const section = privateSections.find(([route]) => pathname === route || pathname.startsWith(`${route}/`));
  if (section) return <div className="private-frame"><Header sectionTitle={section[1]}/><main>{children}</main></div>;
  return <><Header/><main>{children}</main><Footer/></>;
}
