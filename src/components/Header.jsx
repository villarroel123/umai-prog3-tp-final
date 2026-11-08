'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Brand from './Brand';
import { useStore } from '@/context/StoreContext';
export default function Header() {
  const { user } = useStore(); const path = usePathname(); const [open, setOpen] = useState(false);
  const links = user?.role === 'owner' ? [['/panel', 'Panel'], ['/caja', 'Caja'], ['/propietario', 'Productos'], ['/ventas', 'Ventas'], ['/cierres', 'Cierres'], ['/reportes', 'Reportes']] : user?.role === 'admin' ? [['/admin', 'Administración'], ['/ventas', 'Ventas'], ['/reportes', 'Reportes']] : [['/', 'Inicio'], ['/login', 'Acceder'], ['/crear-cuenta', 'Crear cuenta']];
  return <header className="site-header"><div className="header-inner"><Brand/><nav className={open ? 'nav open' : 'nav'} aria-label="Navegación principal">{links.map(([href, label]) => <Link key={href} className={path === href ? 'active' : ''} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav><div className="header-actions"><span className="header-label">SISTEMA DE COBROS</span><Link className="header-account" href={user ? '/cuenta' : '/login'}>{user ? user.name.split(' ')[0] : 'Ingresar'} <ArrowUpRight size={15}/></Link><button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div></div></header>;
}
