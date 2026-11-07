'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { money } from '@/lib/models';
import { useStore } from '@/context/StoreContext';
import ProductVisual from './ProductVisual';
export default function CartPage() {
  const { cart, total, setQuantity, removeFromCart, setCart, user, firebaseConfigured } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function checkout() {
    if (!user) { router.push('/login?next=/carrito'); return; }
    if (!firebaseConfigured) { setError('Configurá Firebase para confirmar pedidos.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.map(({ productId, quantity }) => ({ productId, quantity })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo confirmar el pedido.');
      setCart([]); router.push('/pedidos?confirmado=1');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="container page-space"><Link href="/catalogo" className="back-link"><ArrowLeft size={17}/> Seguir comprando</Link><div className="page-heading compact-heading"><span className="eyebrow">TU SELECCIÓN</span><h1>Mi carrito<span className="heading-count">{cart.length}</span></h1></div>{cart.length ? <div className="cart-layout"><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.productId}><div className="cart-item-visual"><ProductVisual product={item}/></div><div className="cart-item-info"><span className="eyebrow">{item.category}</span><h3>{item.name}</h3><p>{money(item.price)} / {item.unit}</p><button className="remove-link" onClick={() => removeFromCart(item.productId)}><Trash2 size={15}/> Quitar</button></div><div className="cart-item-end"><strong>{money(item.price * item.quantity)}</strong><div className="quantity-control"><button onClick={() => setQuantity(item.productId, item.quantity - 1)} aria-label="Reducir cantidad"><Minus size={15}/></button><span>{item.quantity}</span><button onClick={() => setQuantity(item.productId, item.quantity + 1)} aria-label="Aumentar cantidad"><Plus size={15}/></button></div></div></div>)}</div><aside className="order-summary"><span className="eyebrow">RESUMEN DEL PEDIDO</span><h2>Ya casi está.</h2><div className="summary-row"><span>Productos</span><strong>{money(total)}</strong></div><div className="summary-row"><span>Envío</span><span>A coordinar</span></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div>{error && <p className="form-error">{error}</p>}<button className="button button-dark full" onClick={checkout} disabled={busy}>{busy ? 'Confirmando...' : 'Confirmar pedido'} <ArrowRight size={18}/></button><p className="summary-caption">Compra de prueba · sin cobro online.</p></aside></div> : <div className="empty-state"><h2>Tu carrito está esperando.</h2><p>Explorá el mercado y sumá tus favoritos.</p><Link href="/catalogo" className="button button-dark">Ver productos <ArrowRight size={18}/></Link></div>}</div>;
}
