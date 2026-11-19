'use client';
import { useEffect, useState } from 'react';
export default function CashierStock() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/products', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo cargar el stock.'); setProducts(data.products || []); }).catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, []);
  const visible = products.filter(product => `${product.name} ${product.code} ${product.barcode || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="inner-page"><div className="section-bar"><h1>Consultar stock</h1></div><label className="cashier-stock-search">Buscar producto o código<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o código de barras"/></label>{error && <div className="alert-error" role="alert">{error}</div>}<div className="cashiers-table-wrap"><table className="cashiers-table"><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th></tr></thead><tbody>{visible.map(product => <tr key={product.id}><td>{product.barcode || product.code}</td><td><strong>{product.name}</strong></td><td>{product.category || '—'}</td><td>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(product.salePrice ?? product.price)}</td><td>{product.stock}</td></tr>)}</tbody></table>{!error && !loading && visible.length === 0 && <div className="data-empty">No hay productos para mostrar.</div>}{loading && <div className="data-empty">Cargando productos...</div>}</div></div>;
}
