'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, FileBarChart2, House, Menu, Package, ReceiptText, Settings2, ShoppingBag, UserRound, UsersRound, Wallet, X } from 'lucide-react';
import Brand from './Brand';

const navigation = [
  { href: '/panel', label: 'Resumen', icon: House },
  { href: '/panel/nueva-venta', label: 'Nueva venta', icon: ShoppingBag },
  { href: '/panel/productos', label: 'Productos', icon: Package },
  { href: '/panel/ventas', label: 'Ventas', icon: ReceiptText },
  { href: '/panel/clientes', label: 'Clientes', icon: UsersRound },
  { href: '/panel/estadisticas', label: 'Estadísticas', icon: ChartNoAxesCombined },
  { href: '/panel/configuracion', label: 'Configuración', icon: Settings2 },
];
const existingTools = [
  { href: '/cierres', label: 'Cierres de caja', icon: Wallet },
  { href: '/reportes', label: 'Reportes CSV', icon: FileBarChart2 },
];

export default function PanelShell({ children, user, businessName }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  return <div className="panel-shell">
    <div className="panel-mobile-head"><Brand href="/panel" label="caja, resumen"/><button type="button" className="panel-menu-toggle" aria-controls="panel-navigation" aria-expanded={open} aria-label={open ? 'Cerrar menú del panel' : 'Abrir menú del panel'} onClick={() => setOpen(value => !value)}>{open ? <X size={21}/> : <Menu size={21}/>}</button></div>
    {open && <button type="button" className="panel-overlay" aria-label="Cerrar menú" onClick={() => setOpen(false)}/>}
    <aside className={`panel-sidebar ${open ? 'open' : ''}`} id="panel-navigation"><div className="panel-sidebar-top"><Brand href="/panel" label="caja, resumen"/><span>ESPACIO DE TRABAJO</span></div><nav aria-label="Navegación del negocio" className="panel-nav">{navigation.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || (href !== '/panel' && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{active && <span className="panel-active-dot"/>}</Link>;
    })}</nav><div className="panel-tools"><span>HERRAMIENTAS EXISTENTES</span><nav aria-label="Herramientas del negocio" className="panel-nav">{existingTools.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></Link>)}</nav></div><div className="panel-sidebar-bottom"><div className="panel-business"><span className="panel-business-avatar">{businessName.slice(0, 1).toUpperCase()}</span><span><small>NEGOCIO ACTIVO</small><strong title={businessName}>{businessName}</strong></span></div><Link href="/cuenta" className="panel-profile"><UserRound size={18}/><span>{user.name}</span><ArrowUpRight size={15}/></Link></div></aside>
    <main className="panel-main">{children}</main>
  </div>;
}
