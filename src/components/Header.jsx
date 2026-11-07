'use client';
import Link from 'next/link';
import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import Brand from './Brand';
import { useStore } from '@/context/StoreContext';

export default function Header() {
  const { user, totalItems } = useStore();
  const [open, setOpen] = useState(false);
  return <><div className="announcement">Productos frescos, compras simples. <span>Tu mercado, a tu manera.</span></div><header className="site-header"><div className="header-inner container">
    <Brand />
    <nav className={open ? 'nav open' : 'nav'} aria-label="Navegación principal">
      <Link href="/catalogo" onClick={() => setOpen(false)}>Productos</Link><Link href="/catalogo?category=Frutas+y+verduras" onClick={() => setOpen(false)}>Frescos</Link><Link href="/#como-funciona" onClick={() => setOpen(false)}>Cómo funciona</Link>
      {user?.role === 'owner' && <Link href="/propietario" onClick={() => setOpen(false)}>Mi negocio</Link>}
      {user?.role === 'admin' && <Link href="/admin" onClick={() => setOpen(false)}>Administración</Link>}
    </nav>
    <div className="header-actions"><Link className="icon-link search-shortcut" href="/catalogo" aria-label="Buscar productos"><Search size={20}/></Link><Link className="icon-link" href={user ? '/cuenta' : '/login'} aria-label="Mi cuenta"><UserRound size={20}/></Link><Link className="cart-link" href="/carrito" aria-label={`Carrito con ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}`}><ShoppingBag size={20}/><span>{totalItems}</span></Link><button className="menu-button icon-link" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div>
  </div></header></>;
}
