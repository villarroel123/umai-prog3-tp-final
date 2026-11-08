'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Archive, Boxes, Pencil, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { money } from '@/lib/models';
import { DEFAULT_CATEGORIES } from '@/lib/product';
import ProductThumb from './ProductThumb';
import ProductEditor from './ProductEditor';
import CategoryManager from './CategoryManager';

const emptyProduct = () => ({ name: '', barcode: '', categoryId: DEFAULT_CATEGORIES[0].id, description: '', imageUrl: '', salePrice: '', costPrice: '', stock: 0, minStock: 5, unit: 'unidad' });
const statusOf = product => !product.isActive ? 'archived' : product.stock === 0 ? 'out' : product.stock <= product.minStock ? 'low' : 'available';
const statusLabels = { available: 'Disponible', low: 'Stock bajo', out: 'Agotado', archived: 'Archivado' };

export default function OwnerDashboard({ openNew = false, cashHref = '/caja' }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [form, setForm] = useState(openNew ? emptyProduct() : null);
  const [editingId, setEditingId] = useState(null);
  const [stockForm, setStockForm] = useState(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [productResponse, categoryResponse] = await Promise.all([fetch('/api/products?includeArchived=1'), fetch('/api/categories')]);
    const [productData, categoryData] = await Promise.all([productResponse.json(), categoryResponse.json()]);
    if (!productResponse.ok || !categoryResponse.ok) throw new Error(productData.error || categoryData.error || 'No se pudo cargar el inventario.');
    setProducts(productData.products);
    setCategories(categoryData.categories);
  }
  useEffect(() => { load().catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, []);

  const active = products.filter(product => product.isActive);
  const low = active.filter(product => statusOf(product) === 'low');
  const out = active.filter(product => statusOf(product) === 'out');
  const priced = active.filter(product => product.costPrice !== null);
  const inventoryValue = priced.reduce((sum, product) => sum + product.costPrice * product.stock, 0);
  const filtered = useMemo(() => products.filter(product => {
    const term = `${product.name} ${product.barcode} ${product.code}`.toLocaleLowerCase('es');
    return term.includes(query.toLocaleLowerCase('es')) && (categoryFilter === 'all' || product.categoryId === categoryFilter) && (stockFilter === 'all' || statusOf(product) === stockFilter);
  }).sort((a, b) => sort === 'price' ? a.price - b.price : sort === 'stock' ? a.stock - b.stock : a.name.localeCompare(b.name, 'es')), [products, query, categoryFilter, stockFilter, sort]);

  function startNew() { setEditingId(null); setForm(emptyProduct()); setFormError(''); setNotice(''); }
  function startEdit(product) { setEditingId(product.id); setForm({ ...product, salePrice: product.salePrice, costPrice: product.costPrice ?? '' }); setFormError(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setFormError('');
    try {
      const payload = { ...form, salePrice: Number(form.salePrice), costPrice: form.costPrice === '' ? null : Number(form.costPrice), stock: Number(form.stock), minStock: Number(form.minStock) };
      const response = await fetch(editingId ? `/api/products/${editingId}` : '/api/products', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el producto.');
      await load(); setForm(null); setEditingId(null); setNotice('Producto guardado correctamente.');
    } catch (cause) { setFormError(cause.message); } finally { setBusy(false); }
  }
  async function archive(product) {
    if (!window.confirm(`¿Archivar ${product.name}? Dejará de aparecer en la caja; las ventas anteriores se conservarán.`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo archivar.');
      await load(); setNotice(`${product.name} archivado.`);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function restore(product) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/products/${product.id}/restore`, { method: 'POST' });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo restaurar.');
      await load(); setNotice(`${product.name} restaurado.`);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function adjustStock(event) {
    event.preventDefault(); setBusy(true); setFormError('');
    try {
      const response = await fetch(`/api/products/${stockForm.id}/stock-adjustments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newStock: Number(stockForm.newStock), reason: stockForm.reason }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo ajustar el stock.');
      await load(); setStockForm(null); setNotice(`Stock de ${stockForm.name} actualizado y registrado.`);
    } catch (cause) { setFormError(cause.message); } finally { setBusy(false); }
  }
  function productRow(product, mobile = false) {
    const status = statusOf(product);
    const actions = <div className="inventory-actions">
      <button type="button" onClick={() => startEdit(product)} disabled={busy} aria-label={`Editar ${product.name}`} title="Editar"><Pencil size={16}/></button>
      {product.isActive ? <><button type="button" onClick={() => { setStockForm({ id: product.id, name: product.name, previousStock: product.stock, newStock: product.stock, reason: '' }); setFormError(''); }} disabled={busy} aria-label={`Ajustar stock de ${product.name}`} title="Ajustar stock"><Boxes size={16}/></button><button type="button" onClick={() => archive(product)} disabled={busy} aria-label={`Archivar ${product.name}`} title="Archivar"><Archive size={16}/></button></> : <button type="button" onClick={() => restore(product)} disabled={busy} aria-label={`Restaurar ${product.name}`} title="Restaurar"><RotateCcw size={16}/></button>}
    </div>;
    if (mobile) return <article className="inventory-card" key={product.id}><ProductThumb product={product}/><div className="inventory-card-body"><strong>{product.name}</strong><small>{product.barcode || product.code} · {product.category}</small><div><span>{money(product.price)}</span><span>Stock {product.stock}</span><span className={`inventory-status ${status}`}>{statusLabels[status]}</span></div>{actions}</div></article>;
    return <tr key={product.id}><td><ProductThumb product={product}/></td><td><strong>{product.name}</strong></td><td className="mono">{product.barcode || '—'}</td><td>{product.category}</td><td><strong>{money(product.price)}</strong></td><td>{product.stock} {product.unit}</td><td><span className={`inventory-status ${status}`}>{statusLabels[status]}</span></td><td>{actions}</td></tr>;
  }

  return <div className="inner-page inventory-page">
    <div className="page-top"><div><span className="eyebrow">MI NEGOCIO / INVENTARIO</span><h1>Productos</h1><p>Administrá los productos y el inventario de tu negocio</p></div><button className="button-primary" type="button" onClick={startNew}><Plus size={17}/> Agregar producto</button></div>
    <div className="inventory-metrics"><div><span>Productos registrados</span><strong>{products.length}</strong><small>{active.length} activos</small></div><div><span>Stock bajo</span><strong>{low.length}</strong><small>Igual o menor al mínimo</small></div><div><span>Agotados</span><strong>{out.length}</strong><small>Sin unidades disponibles</small></div><div><span>Valor del inventario</span><strong>{priced.length ? money(inventoryValue) : '—'}</strong><small>{priced.length ? `${priced.length} con costo de compra` : 'Agregá costos de compra'}</small></div></div>
    <div className="section-bar"><div><span className="eyebrow">CATÁLOGO DE CAJA</span><h2>Tu inventario</h2></div><div className="catalog-actions"><button type="button" className="text-link" onClick={() => setCategoriesOpen(true)}><SlidersHorizontal size={16}/> Categorías</button><Link href={cashHref} className="text-link">Ir a caja <ArrowRight size={16}/></Link></div></div>
    {error && <div className="alert-error" role="alert">{error}</div>}{notice && <div className="catalog-import-note" role="status">{notice}</div>}
    <div className="inventory-toolbar"><label className="inventory-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre o código" aria-label="Buscar productos"/></label><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filtrar categoría"><option value="all">Todas las categorías</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select value={stockFilter} onChange={event => setStockFilter(event.target.value)} aria-label="Filtrar estado"><option value="all">Todos los estados</option><option value="available">Disponible</option><option value="low">Stock bajo</option><option value="out">Agotado</option><option value="archived">Archivado</option></select><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Ordenar productos"><option value="name">Nombre A–Z</option><option value="price">Menor precio</option><option value="stock">Menor stock</option></select></div>
    {loading ? <div className="data-empty">Cargando inventario...</div> : !products.length ? <div className="inventory-empty"><Boxes size={30}/><h2>Tu inventario está vacío. Agregá tu primer producto para comenzar a vender</h2><button className="button-primary" type="button" onClick={startNew}><Plus size={16}/> Agregar primer producto</button></div> : !filtered.length ? <div className="inventory-empty"><Search size={27}/><h2>No encontramos productos con esos filtros.</h2><p>Probá otra búsqueda o cambiá los filtros.</p></div> : <><div className="inventory-table-wrap"><table className="data-table inventory-table"><thead><tr><th>Imagen</th><th>Producto</th><th>Código de barras</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(product => productRow(product))}</tbody></table></div><div className="inventory-cards">{filtered.map(product => productRow(product, true))}</div><p className="inventory-count">{filtered.length} de {products.length} productos</p></>}
    {form && <ProductEditor form={form} setForm={setForm} categories={categories} imageOptions={products.filter(product => product.imageUrl).filter((product, index, all) => all.findIndex(item => item.imageUrl === product.imageUrl) === index)} editing={Boolean(editingId)} busy={busy} error={formError} onClose={() => { setForm(null); setEditingId(null); }} onSubmit={save}/>}
    {categoriesOpen && <CategoryManager categories={categories} onChange={load} onClose={() => setCategoriesOpen(false)}/>}
    {stockForm && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setStockForm(null); }}><div className="modal stock-modal" role="dialog" aria-modal="true" aria-label={`Ajustar stock de ${stockForm.name}`}><div className="modal-head"><div><span className="eyebrow">INVENTARIO / MOVIMIENTO</span><h2>Ajustar stock</h2></div><button type="button" onClick={() => setStockForm(null)} aria-label="Cerrar"><X size={20}/></button></div><p><strong>{stockForm.name}</strong> · Stock actual: {stockForm.previousStock}</p><form onSubmit={adjustStock}><label>Nueva cantidad<input type="number" min="0" max="1000000" step="1" required value={stockForm.newStock} onChange={event => setStockForm(current => ({ ...current, newStock: event.target.value }))}/></label><label>Motivo del ajuste<textarea required minLength={3} maxLength={200} rows={3} value={stockForm.reason} onChange={event => setStockForm(current => ({ ...current, reason: event.target.value }))} placeholder="Ej. Recuento de mercadería"/></label>{formError && <div className="alert-error" role="alert">{formError}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setStockForm(null)}>Cancelar</button><button className="button-primary" disabled={busy}>Guardar ajuste</button></div></form></div></div>}
  </div>;
}
