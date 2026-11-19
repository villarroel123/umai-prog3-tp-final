'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Brand from './Brand';
import { useStore } from '@/context/StoreContext';
export default function Header({ sectionTitle }) {
  const { user } = useStore(); const path = usePathname(); const [open, setOpen] = useState(false);
  const links = user?.role === 'business_owner' ? [['/negocio', 'Panel'], ['/caja', 'Caja'], ['/ventas', 'Ventas'], ['/cierres', 'Cierres'], ['/reportes', 'Reportes']] : user?.role === 'platform_admin' ? [['/admin', 'Administración'], ['/admin/usuarios', 'Usuarios'], ['/admin/negocios', 'Negocios'], ['/admin/soporte', 'Soporte']] : user?.role === 'cashier' ? [...(user.permissions?.sell ? [['/caja', 'Caja'], ['/caja/mi-turno', 'Mi turno']] : []), ...(user.permissions?.viewStock || user.permissions?.sell ? [['/caja/stock', 'Stock']] : []), ['/caja/perfil', 'Mi perfil']] : [['/', 'Inicio'], ['/login', 'Acceder'], ['/crear-cuenta', 'Crear cuenta']];
  return <header className="site-header"><div className="header-inner"><div className="header-identity"><Brand/>{sectionTitle && <h1 className="header-section-title">{sectionTitle}</h1>}</div><nav className={open ? 'nav open' : 'nav'} aria-label="Navegación principal">{links.map(([href, label]) => <Link key={href} className={path === href ? 'active' : ''} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav><div className="header-actions">{!sectionTitle && <span className="header-label">SISTEMA DE COBROS</span>}<Link className="header-account" href={user ? '/cuenta' : '/login'} aria-label={user ? 'Mi cuenta' : 'Acceder'}><span className="header-account-name">{user ? user.name.split(' ')[0] : 'Ingresar'}</span><span className="header-account-avatar" aria-hidden="true">{user?.name?.slice(0, 1).toUpperCase() || '?'}</span><ArrowUpRight size={15}/></Link><button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div></div></header>;
}
