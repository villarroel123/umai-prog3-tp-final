'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowDownUp, Package, Pencil, Plus, RotateCcw, Search, Upload, X } from 'lucide-react';
import { money } from '@/lib/models';
import { parseProductsFile } from './importProducts';

const blank = { name: '', barcode: '', description: '', categoryId: 'base-otros', brandId: '', supplierId: '', salePrice: '', costPrice: '', stock: '0', minStock: '5', unit: 'unidad', imageUrl: '' };
const filters = [['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos'], ['low', 'Stock bajo'], ['empty', 'Sin stock']];

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

function OptionPicker({ label, value, items, onChange, onCreate }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  return <div className="article-option"><label>{label}<select value={value} onChange={event => onChange(event.target.value)}><option value="">Sin {label.toLowerCase()}</option>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className="article-text-button" onClick={() => setAdding(value => !value)} aria-label={`Crear ${label.toLowerCase()}`}><Plus size={16}/> Crear</button>{adding && <div className="article-option-new"><input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={60} placeholder={`Nueva ${label.toLowerCase()}`}/><button type="button" onClick={async () => { if (name.trim().length < 2) return; if (await onCreate(name.trim())) { setName(''); setAdding(false); } }}>Agregar</button></div>}</div>;
}

export default function InventoryPage({ openNew = false }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sort, setSort] = useState('name');
  const [editing, setEditing] = useState(openNew ? { ...blank } : null);
  const [tab, setTab] = useState('identity');
  const [archive, setArchive] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);

  async function load() {
    const [p, c, b, s] = await Promise.all([
      api('/api/products?includeArchived=1'), api('/api/categories'), api('/api/catalog-options/brands'), api('/api/catalog-options/suppliers'),
    ]);
    setProducts(p.products); setCategories(c.categories); setBrands(b.options); setSuppliers(s.options);
  }
  useEffect(() => { load().catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, []);

  const summary = useMemo(() => ({ total: products.length, active: products.filter(p => p.isActive).length, units: products.filter(p => p.isActive).reduce((sum, p) => sum + (Number(p.stock) || 0), 0), low: products.filter(p => p.isActive && p.stock > 0 && p.stock <= p.minStock).length, empty: products.filter(p => p.isActive && p.stock <= 0).length }), [products]);
  const visible = useMemo(() => products.filter(product => {
    const term = query.trim().toLocaleLowerCase('es');
    return (!term || [product.name, product.barcode, product.code, product.category, product.brand, product.supplier].some(value => String(value || '').toLocaleLowerCase('es').includes(term)))
      && (!category || product.categoryId === category) && (!brand || product.brandId === brand) && (!supplier || product.supplierId === supplier)
      && (status === 'all' || status === 'active' && product.isActive || status === 'inactive' && !product.isActive || status === 'low' && product.isActive && product.stock > 0 && product.stock <= product.minStock || status === 'empty' && product.isActive && product.stock <= 0);
  }).sort((a, b) => sort === 'updatedAt' ? String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) : sort === 'stock' ? a.stock - b.stock : sort === 'salePrice' ? a.salePrice - b.salePrice : a.name.localeCompare(b.name, 'es')), [products, query, category, brand, supplier, status, sort]);

  function start(product) { setEditing(product ? { ...product, stock: String(product.stock), salePrice: String(product.salePrice), costPrice: product.costPrice == null ? '' : String(product.costPrice) } : { ...blank }); setTab('identity'); setError(''); }
  function field(name, value) { setEditing(current => ({ ...current, [name]: value })); }
  async function createOption(type, name) {
    if (!name) return false;
    try {
      const endpoint = type === 'categories' ? '/api/categories' : `/api/catalog-options/${type}`;
      const result = await api(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const option = result.category || result.option;
      if (type === 'categories') { setCategories(current => [...current, option]); field('categoryId', option.id); }
      if (type === 'brands') { setBrands(current => [...current, option]); field('brandId', option.id); }
      if (type === 'suppliers') { setSuppliers(current => [...current, option]); field('supplierId', option.id); }
      return true;
    } catch (cause) { setError(cause.message); return false; }
  }
  async function save(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!editing.name.trim() || !editing.categoryId) { setTab('identity'); setError('Completá el nombre y la categoría.'); return; }
    if (!Number.isFinite(Number(editing.salePrice)) || Number(editing.salePrice) <= 0) { setTab('sale'); setError('Ingresá un precio de venta válido.'); return; }
    setBusy(true);
    try {
      const isEdit = Boolean(editing.id);
      const { product } = await api(isEdit ? `/api/products/${editing.id}` : '/api/products', { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
      setProducts(current => isEdit ? current.map(item => item.id === product.id ? product : item) : [...current, product]);
      setEditing(null); setNotice(isEdit ? 'Producto actualizado.' : 'Producto creado y disponible en la caja.');
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function archiveProduct(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api(`/api/products/${archive.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      setProducts(current => current.map(item => item.id === archive.id ? { ...item, isActive: false, archivedAt: new Date().toISOString() } : item));
      setArchive(null); setReason(''); setNotice('Producto dado de baja. El historial de ventas permanece intacto.');
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function restore(product) {
    setBusy(true); setError('');
    try {
      const data = await api(`/api/products/${product.id}/restore`, { method: 'POST' });
      setProducts(current => current.map(item => item.id === product.id ? data.product : item)); setNotice('Producto reactivado.');
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { products: parsed, errors } = await parseProductsFile(file);
      if (!parsed.length) throw new Error(errors[0] || 'El archivo no tiene productos para importar.');
      const data = await api('/api/products/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: parsed }) });
      await load();
      setNotice(`Se importaron ${data.total} productos (${data.created} nuevos, ${data.updated} actualizados).${errors.length ? ` ${errors.length} filas se omitieron.` : ''}`);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); event.target.value = ''; }
  }
  const input = (label, name, props = {}) => <label>{label}<input value={editing[name] ?? ''} onChange={event => field(name, event.target.value)} {...props}/></label>;

  return <div className="articles-page"><div className="articles-head"><div><span className="eyebrow">NEGOCIO / PRODUCTOS</span><h1>Inventario<span className="accent">.</span></h1><p>Administrá productos, precios y stock en un solo lugar.</p></div><div className="articles-head-actions"><input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" hidden onChange={importFile}/><button type="button" className="article-secondary" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={17}/> Importar Excel</button><button type="button" className="article-primary" onClick={() => start(null)}><Plus size={18}/> Nuevo producto</button></div></div>
    <div className="articles-stats"><div><span>Total de productos</span><strong>{summary.total}</strong></div><div><span>Activos</span><strong>{summary.active}</strong></div><div><span>Unidades en stock</span><strong>{summary.units}</strong></div><div><span>Stock bajo</span><strong>{summary.low}</strong></div><div><span>Sin stock</span><strong>{summary.empty}</strong></div></div>
    {notice && <div className="catalog-import-note" role="status">{notice}</div>}{error && <div className="alert-error" role="alert">{error}</div>}
    <section className="articles-card"><div className="articles-toolbar"><div className="articles-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, código, marca..." aria-label="Buscar productos"/></div><div className="articles-filters"><select value={status} onChange={event => setStatus(event.target.value)} aria-label="Estado">{filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Categoría"><option value="">Todas las categorías</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={brand} onChange={event => setBrand(event.target.value)} aria-label="Marca"><option value="">Todas las marcas</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={supplier} onChange={event => setSupplier(event.target.value)} aria-label="Proveedor"><option value="">Todos los proveedores</option>{suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div><div className="articles-table-wrap"><table className="articles-table"><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Marca</th><th>Costo</th><th>Precio</th><th>Margen</th><th>Stock</th><th>Estado</th><th><button onClick={() => setSort(sort === 'updatedAt' ? 'name' : 'updatedAt')}><ArrowDownUp size={14}/> Modificación</button></th><th>Acciones</th></tr></thead><tbody>{visible.map(product => <tr key={product.id}><td className="article-code">{product.barcode || product.code || '—'}</td><td><strong>{product.name}</strong></td><td>{product.category}</td><td>{product.brand || '—'}</td><td>{product.costPrice == null ? '—' : money(product.costPrice)}</td><td>{money(product.salePrice)}</td><td>{product.costPrice > 0 ? `${Math.round((product.salePrice - product.costPrice) / product.salePrice * 100)} %` : '—'}</td><td><span className={product.stock <= product.minStock ? 'article-low' : ''}>{product.stock}</span></td><td><span className={`article-status ${product.isActive ? 'active' : ''}`}>{product.isActive ? 'Activo' : 'Inactivo'}</span></td><td>{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('es-AR') : '—'}</td><td><div className="article-row-actions"><button aria-label={`Editar ${product.name}`} title="Editar" onClick={() => start(product)}><Pencil size={16}/></button>{product.isActive ? <button aria-label={`Dar de baja ${product.name}`} title="Dar de baja" onClick={() => { setArchive(product); setReason(''); }}><Archive size={16}/></button> : <button aria-label={`Reactivar ${product.name}`} title="Reactivar" onClick={() => restore(product)} disabled={busy}><RotateCcw size={16}/></button>}</div></td></tr>)}</tbody></table>{!loading && !error && !visible.length && <div className="articles-empty"><Package size={28}/><strong>{products.length ? 'No hay productos con estos filtros' : 'Todavía no hay productos'}</strong><span>{products.length ? 'Probá otra búsqueda o filtro.' : 'Creá el primero para verlo también en la caja.'}</span></div>}{loading && <div className="articles-empty">Cargando productos...</div>}</div><div className="articles-footer"><span>{visible.length} de {products.length} productos</span><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Ordenar productos"><option value="name">Ordenar por nombre</option><option value="updatedAt">Última modificación</option><option value="stock">Menor stock</option><option value="salePrice">Menor precio</option></select></div></section>
    {editing && <div className="article-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setEditing(null); }}><div className="article-modal" role="dialog" aria-modal="true" aria-label={editing.id ? 'Editar producto' : 'Nuevo producto'}><div className="article-modal-head"><div><span className="eyebrow">{editing.id ? 'MODIFICACIÓN' : 'ALTA'} / PRODUCTO</span><h2>{editing.id ? 'Editar producto' : 'Nuevo producto'}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setEditing(null)} disabled={busy}><X size={20}/></button></div><div className="article-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === 'identity'} className={tab === 'identity' ? 'active' : ''} onClick={() => setTab('identity')}>Identificación</button><button type="button" role="tab" aria-selected={tab === 'sale'} className={tab === 'sale' ? 'active' : ''} onClick={() => setTab('sale')}>Venta y stock</button></div><form onSubmit={save}>{error && <p className="article-form-error" role="alert">{error}</p>}<div className="article-form-body">{tab === 'identity' ? <div className="article-fields">{input('Nombre o descripción', 'name', { required: true, minLength: 2, maxLength: 80 })}{input('Código de barras', 'barcode', { placeholder: 'Opcional' })}{input('Descripción adicional', 'description', { maxLength: 500 })}<OptionPicker label="Categoría" value={editing.categoryId} items={categories} onChange={value => field('categoryId', value)} onCreate={name => createOption('categories', name)}/><OptionPicker label="Marca" value={editing.brandId} items={brands} onChange={value => field('brandId', value)} onCreate={name => createOption('brands', name)}/><OptionPicker label="Proveedor" value={editing.supplierId} items={suppliers} onChange={value => field('supplierId', value)} onCreate={name => createOption('suppliers', name)}/>{input('Imagen local', 'imageUrl', { placeholder: '/assets/products/producto.webp' })}</div> : <div className="article-fields">{input('Precio de venta', 'salePrice', { type: 'number', min: '0.01', step: '0.01', required: true })}{input('Costo de compra', 'costPrice', { type: 'number', min: '0', step: '0.01', placeholder: 'Opcional' })}<label>Unidad<select value={editing.unit} onChange={event => field('unit', event.target.value)}><option value="unidad">Unidad</option><option value="kilogramo">Kilogramo</option><option value="litro">Litro</option></select></label>{input('Stock inicial', 'stock', { type: 'number', min: '0', step: '1', required: true, disabled: Boolean(editing.id) })}{editing.id && <p className="article-help">Para actualizar el stock de un producto existente, importá un archivo de Excel con su código.</p>}{input('Stock mínimo', 'minStock', { type: 'number', min: '0', step: '1', required: true })}</div>}</div><div className="article-form-actions"><button type="button" onClick={() => setEditing(null)} disabled={busy}>Cancelar</button><button type="submit" className="article-primary" disabled={busy}>{busy ? 'Guardando...' : editing.id ? 'Guardar cambios' : 'Crear producto'}</button></div></form></div></div>}
    {archive && <div className="article-modal-backdrop"><div className="article-confirm" role="dialog" aria-modal="true" aria-label="Dar de baja producto"><h2>Dar de baja producto</h2><p><strong>{archive.name}</strong> dejará de aparecer en la caja. Las ventas anteriores se conservarán.</p><form onSubmit={archiveProduct}>{error && <p className="article-form-error" role="alert">{error}</p>}<label>Motivo<input value={reason} onChange={event => setReason(event.target.value)} required minLength={3} maxLength={200} placeholder="Por ejemplo, producto discontinuado"/></label><div className="article-form-actions"><button type="button" onClick={() => setArchive(null)} disabled={busy}>Cancelar</button><button type="submit" className="article-danger" disabled={busy}>{busy ? 'Guardando...' : 'Confirmar baja'}</button></div></form></div></div>}
  </div>;
}
