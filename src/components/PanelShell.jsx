'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Boxes, ChartNoAxesCombined, ChevronDown, FileBarChart2, House, LifeBuoy, LogOut, Menu, ReceiptText, Settings2, UserRound, UsersRound, Wallet, X } from 'lucide-react';
import { auth } from '@/lib/firebase-client';
import Brand from './Brand';

const navigation = [
  { href: '/panel', label: 'Resumen', icon: House },
  { href: '/panel/ventas', label: 'Ventas', icon: ReceiptText },
  { href: '/panel/clientes', label: 'Clientes', icon: UsersRound },
  { href: '/panel/estadisticas', label: 'Estadísticas', icon: ChartNoAxesCombined },
  { href: '/panel/configuracion', label: 'Configuración', icon: Settings2 },
];
const businessNavigation = [
  { href: '/negocio', label: 'Resumen', icon: House },
  { href: '/negocio/inventario', label: 'Inventario', icon: Boxes },
  { href: '/negocio/empleados', label: 'Cajas', icon: Wallet },
  { href: '/negocio/ventas', label: 'Ventas', icon: ReceiptText },
  { href: '/negocio/cajas', label: 'Cierres y movimientos', icon: ArrowLeftRight },
  { href: '/negocio/clientes', label: 'Clientes', icon: UsersRound },
  { href: '/negocio/estadisticas', label: 'Estadísticas', icon: ChartNoAxesCombined },
  { href: '/negocio/soporte', label: 'Soporte', icon: LifeBuoy },
  { href: '/negocio/configuracion', label: 'Configuración', icon: Settings2 },
];
function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PanelShell({ children, user, businessName, basePath = '/panel' }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = basePath === '/negocio' ? businessNavigation : navigation;
  const activeItem = items.find(item => isActive(pathname, item.href) && (item.href !== basePath || pathname === basePath));
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [logoutError, setLogoutError] = useState('');
  const accountRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
    setTooltip(null);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    function closeAccount(event) {
      if (event.key === 'Escape' || (event.type === 'pointerdown' && !accountRef.current?.contains(event.target))) setAccountOpen(false);
    }
    document.addEventListener('pointerdown', closeAccount);
    document.addEventListener('keydown', closeAccount);
    return () => {
      document.removeEventListener('pointerdown', closeAccount);
      document.removeEventListener('keydown', closeAccount);
    };
  }, [accountOpen]);

  function showTooltip(event, label) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  }

  async function logout() {
    setLogoutError('');
    try {
      if (auth) await signOut(auth);
      const response = await fetch('/api/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo cerrar la sesión.');
      router.push('/');
      router.refresh();
    } catch (error) {
      setLogoutError(error.message || 'No se pudo cerrar la sesión.');
    }
  }

  return <div className="panel-shell">
    <div className="panel-mobile-head">
      <Brand href={basePath} label="caja, resumen"/>
      <button type="button" className="panel-menu-toggle" aria-controls="panel-navigation" aria-expanded={open} aria-label={open ? 'Cerrar menú del panel' : 'Abrir menú del panel'} onClick={() => setOpen(value => !value)}>{open ? <X size={21}/> : <Menu size={21}/>}</button>
    </div>
    {open && <button type="button" className="panel-overlay" aria-label="Cerrar menú" onClick={() => setOpen(false)}/>}
    <aside className={`panel-sidebar ${open ? 'open' : ''}`} id="panel-navigation" onScroll={() => setTooltip(null)}>
      <div className="panel-sidebar-top"><Brand href={basePath} label="caja, resumen"/></div>
      <nav aria-label="Navegación del negocio" className="panel-nav">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href) && (href !== basePath || pathname === basePath);
          return <Link key={href} href={href} className={active ? 'active' : ''} aria-label={label} aria-current={active ? 'page' : undefined} onClick={() => { setOpen(false); setTooltip(null); }} onMouseEnter={event => showTooltip(event, label)} onMouseLeave={() => setTooltip(null)} onFocus={event => showTooltip(event, label)} onBlur={() => setTooltip(null)}>
            <Icon size={21} strokeWidth={1.8} aria-hidden="true"/>
            <span className="panel-nav-label">{label}</span>
          </Link>;
        })}
      </nav>
    </aside>
    {tooltip && <span className="panel-tooltip" style={{ top: tooltip.top }} aria-hidden="true">{tooltip.label}</span>}
    <header className="panel-topbar">
      <div className="panel-topbar-section"><h1>{activeItem?.label || 'Gestión'}</h1></div>
      <div className="panel-topbar-actions">
        <div className="panel-current-business" title={businessName}><span className="panel-business-avatar">{businessName.slice(0, 1).toUpperCase()}</span><span>{businessName}</span></div>
        <div className="panel-account" ref={accountRef}>
          <button type="button" className="panel-account-toggle" aria-label={`Cuenta de ${user.name}`} aria-expanded={accountOpen} aria-controls="panel-account-options" onClick={() => setAccountOpen(value => !value)}><span>{user.name.slice(0, 1).toUpperCase()}</span><ChevronDown size={14} aria-hidden="true"/></button>
          {accountOpen && <div className="panel-account-menu" id="panel-account-options"><div className="panel-account-ident"><strong>{user.name}</strong><small>{user.email}</small></div><Link href="/cuenta" onClick={() => setAccountOpen(false)}><UserRound size={16}/> Mi perfil</Link><div className="panel-account-divider"/><Link href="/cierres" onClick={() => setAccountOpen(false)}><Wallet size={16}/> Cierres de caja</Link><Link href="/reportes" onClick={() => setAccountOpen(false)}><FileBarChart2 size={16}/> Reportes CSV</Link><div className="panel-account-divider"/><button type="button" onClick={logout}><LogOut size={16}/> Cerrar sesión</button>{logoutError && <p role="alert">{logoutError}</p>}</div>}
        </div>
      </div>
    </header>
    <main className="panel-main">{children}</main>
  </div>;
}
