'use client';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { money } from '@/lib/models';
import { useStore } from '@/context/StoreContext';
import ProductVisual from './ProductVisual';
export default function ProductDetail({ id }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useStore();
  useEffect(() => { fetch(`/api/products/${id}`).then(r => r.json()).then(data => { if (data.error) throw new Error(data.error); setProduct(data.product); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [id]);
  if (loading) return <div className="container page-space state-message">Cargando producto...</div>;
  if (error) return <div className="container page-space empty-state"><h1>{error}</h1><Link href="/catalogo" className="button button-dark">Volver al catálogo</Link></div>;
  return <div className="container page-space"><Link href="/catalogo" className="back-link"><ArrowLeft size={17}/> Volver al catálogo</Link><div className="detail-grid"><ProductVisual product={product} large/><div className="detail-copy"><span className="eyebrow">{product.category}</span><h1>{product.name}</h1><p className="detail-description">{product.description || 'Un esencial para disfrutar todos los días.'}</p><div className="detail-price">{money(product.price)} <span>/ {product.unit}</span></div><div className="detail-stock">{product.stock > 0 ? `Disponible · ${product.stock} en stock` : 'Sin stock'}</div><div className="detail-buy"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Reducir cantidad"><Minus size={17}/></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} aria-label="Aumentar cantidad"><Plus size={17}/></button></div><button className="button button-dark" disabled={!product.stock} onClick={() => { for (let i = 0; i < quantity; i++) addToCart(product); }}>Agregar al carrito <ShoppingBag size={18}/></button></div><div className="detail-info"><strong>Elegí bien, comprá fácil.</strong><p>Revisá tu pedido en el carrito y seguí su estado desde tu cuenta.</p></div></div></div></div>;
}
