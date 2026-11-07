'use client';
import Link from 'next/link';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import Brand from './Brand';
import { useStore } from '@/context/StoreContext';

export default function Header() {
  const { user, totalItems } = useStore();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return <header className="site-header"><div className="header-inner container">
    <Brand />
    <nav className={open ? 'nav open' : 'nav'} aria-label="Navegación principal">
      <Link href="/" onClick={close}>inicio</Link>
      <Link href="/catalogo" onClick={close}>catálogo</Link>
      <Link href="/catalogo?category=Frutas+y+verduras" onClick={close}>frescos</Link>
      <Link href="/#como-funciona" onClick={close}>cómo funciona</Link>
      {user?.role === 'owner' && <Link href="/propietario" onClick={close}>mi negocio</Link>}
      {user?.role === 'admin' && <Link href="/admin" onClick={close}>administración</Link>}
    </nav>
    <div className="header-actions">
      <Link className="header-account" href={user ? '/cuenta' : '/login'}>mi cuenta <span aria-hidden="true">↗</span></Link>
      <Link className="cart-link" href="/carrito" aria-label={`Carrito con ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}`}><ShoppingBag size={18}/><span>{totalItems}</span></Link>
      <button className="menu-button icon-link" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
    </div>
  </div></header>;
}
