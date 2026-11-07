'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES } from '@/lib/models';
import ProductCard from './ProductCard';
export default function Catalog({ initialCategory = '', compact = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [demo, setDemo] = useState(false);
  useEffect(() => { fetch('/api/products').then(r => r.json()).then(data => { if (data.error) throw new Error(data.error); setProducts(data.products); setDemo(data.demo); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : Number(b.featured) - Number(a.featured)), [products, category, search, sort]);
  const shown = compact ? visible.slice(0, 4) : visible;
  return <><div className="catalog-tools"><div className="category-list"><button className={!category ? 'active' : ''} onClick={() => setCategory('')}>Todos</button>{CATEGORIES.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>{!compact && <div className="catalog-controls"><label className="search-field"><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar productos..." aria-label="Buscar productos"/></label><label className="sort-field"><SlidersHorizontal size={18}/><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Ordenar productos"><option value="featured">Destacados</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select></label></div>}</div>
    {demo && !compact && <p className="demo-note">Vista de muestra: configurá Firebase para cargar productos reales y habilitar compras.</p>}
    {loading ? <div className="product-grid">{Array.from({ length: compact ? 4 : 8 }, (_, i) => <div className="skeleton-card" key={i}/>)}</div> : error ? <p className="state-message">{error}</p> : shown.length ? <div className="product-grid">{shown.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <div className="empty-state"><h3>No encontramos productos</h3><p>Probá con otra búsqueda o categoría.</p><button className="text-button" onClick={() => { setCategory(''); setSearch(''); }}>Ver todos</button></div>}
  </>;
}
