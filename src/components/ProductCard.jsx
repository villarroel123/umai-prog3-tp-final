'use client';
import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { money } from '@/lib/models';
import { useStore } from '@/context/StoreContext';
import ProductVisual from './ProductVisual';
export default function ProductCard({ product }) {
  const { addToCart } = useStore();
  return <article className="product-card"><Link href={`/producto/${product.id}`} className="product-card-image"><ProductVisual product={product}/><span className="product-arrow"><ArrowUpRight size={18}/></span></Link><div className="product-card-body"><div><span className="eyebrow">{product.category}</span><Link href={`/producto/${product.id}`}><h3>{product.name}</h3></Link><p>{money(product.price)} <span>/ {product.unit}</span></p></div><button type="button" className="add-button" onClick={() => addToCart(product)} disabled={product.stock < 1} aria-label={`Agregar ${product.name} al carrito`}><Plus size={19}/></button></div></article>;
}
