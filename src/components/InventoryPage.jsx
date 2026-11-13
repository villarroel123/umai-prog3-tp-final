'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Package, Search } from 'lucide-react';
import ProductThumb from './ProductThumb';
import { parseProductsFile } from './importProducts';

const money = value =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const fileInput = useRef(null);

  const loadProducts = useCallback(async () => {
    const response = await fetch('/api/products?includeArchived=1', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo cargar el inventario.');
    }

    setProducts(data.products || []);
  }, []);

  useEffect(() => {
    let active = true;

    loadProducts()
      .catch(reason => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadProducts]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file.name);
    setImportMessage('');
    setError('');
    setImporting(true);

    try {
      const { products: parsed, errors } = await parseProductsFile(file);

      if (!parsed.length) {
        throw new Error(errors[0] || 'El archivo no tiene productos para importar.');
      }

      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: parsed }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron guardar los productos.');
      }

      // Recarga desde el servidor: lo que se ve es lo que quedó guardado
      await loadProducts();

      setImportMessage(
        `Se importaron ${data.total} productos (${data.created} nuevos, ${data.updated} actualizados).` +
          (errors.length ? ` ${errors.length} filas se omitieron.` : ''),
      );
    } catch (reason) {
      setError(reason.message);
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const categories = useMemo(
    () => ['Todas', ...new Set(products.map(product => product.category).filter(Boolean))],
    [products],
  );

  const visible = useMemo(
    () =>
      products.filter(product => {
        const text = `${product.name} ${product.barcode || product.code || ''}`
          .toLocaleLowerCase('es');
        const search = query.trim().toLocaleLowerCase('es');

        return (category === 'Todas' || product.category === category) && text.includes(search);
      }),
    [products, query, category],
  );

  const activeProducts = products.filter(product => product.isActive !== false);
  const lowStock = activeProducts.filter(
    product => product.stock <= (product.minStock ?? 5),
  );
  const units = activeProducts.reduce(
    (sum, product) => sum + (Number(product.stock) || 0),
    0,
  );

  return (
    <div className="inventory-page">
      <header className="inventory-heading">
        <h1>Inventario</h1>
      </header>

      <section
        className="inventory-summary"
        aria-label="Resumen del inventario"
      >
        <div className="inventory-metric">
          <span className="text-[11px] font-bold text-[#85858f]">PRODUCTOS ACTIVOS</span>
          <strong>{activeProducts.length}</strong>
          <small className="mt-auto text-[10px] text-[#9999a3]">Disponibles para vender</small>
        </div>
        <div className="inventory-metric">
          <span className="text-[11px] font-bold text-[#85858f]">UNIDADES EN STOCK</span>
          <strong>{units}</strong>
          <small className="mt-auto text-[10px] text-[#9999a3]">En todos los productos</small>
        </div>
        <div className="inventory-metric">
          <span className="text-[11px] font-bold text-[#85858f]">STOCK BAJO</span>
          <strong>{lowStock.length}</strong>
          <small className="mt-auto text-[10px] text-[#9999a3]">En el mínimo o por debajo</small>
        </div>
        <div className="inventory-upload">
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleFile}
          />
          <button
            className="inventory-upload-button"
            type="button"
            disabled={importing}
            onClick={() => fileInput.current?.click()}
          >
            <span>
              {importing ? 'Importando...' : 'Agregar inventario mediante Excel'}
            </span>
          </button>
          {selectedFile && (
            <p className="inventory-file-name">
              Archivo seleccionado: {selectedFile}
            </p>
          )}
          {importMessage && (
            <p className="inventory-file-name" role="status">
              {importMessage}
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="inventory-toolbar">
        <label className="inventory-search">
          <Search size={17} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar por nombre o c&#243;digo"
            aria-label="Buscar producto"
            className="inventory-search-input"
          />
        </label>

        <select
          value={category}
          onChange={event => setCategory(event.target.value)}
          aria-label="Filtrar por categor&#237;a"
          className="inventory-category-select"
        >
          {categories.map(item => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="inventory-table-wrap">
        <table className="data-table inventory-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Código</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Precio de venta</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(product => {
              const archived = product.isActive === false;
              const low = !archived && product.stock <= (product.minStock ?? 5);
              const statusLabel = archived
                ? 'Archivado'
                : product.stock === 0
                  ? 'Agotado'
                  : low
                    ? 'Reponer'
                    : 'Disponible';

              return (
                <tr key={product.id}>
                  <td>
                    <div className="inline-flex min-w-0 items-center gap-3">
                      <ProductThumb product={product} />
                      <strong className="text-xs text-[var(--ink)]">{product.name}</strong>
                    </div>
                  </td>
                  <td>{product.barcode || product.code || '\u2014'}</td>
                  <td>{product.category || 'Otros'}</td>
                  <td>
                    {product.stock} {product.unit || 'unidad'}
                  </td>
                  <td>{money(product.salePrice ?? product.price)}</td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-extrabold ${archived ? 'bg-[#f0f0f2] text-[#777780]' : product.stock === 0 ? 'bg-[#fff0f0] text-[#b44747]' : low ? 'bg-[#fff3e6] text-[#a3662e]' : 'bg-[#edf7ef] text-[#387452]'}`}
                    >
                      {low && !archived && <AlertTriangle size={12} />}
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading ? (
        <div className="inventory-empty">
          <Package size={28} />
          <p className="mt-4 text-sm text-[#898992]">Cargando inventario...</p>
        </div>
      ) : (
        !visible.length && (
          <div className="inventory-empty">
            <Package size={28} />
            <h2>
              {products.length
                ? 'No hay productos para mostrar'
                : 'Todav\u00eda no hay productos'}
            </h2>
            <p>
              {products.length
                ? 'Prob\u00e1 cambiar la b\u00fasqueda o la categor\u00eda.'
                : 'Los productos que cargues para tu negocio aparecer\u00e1n ac\u00e1.'}
            </p>
          </div>
        )
      )}

      {!loading && visible.length > 0 && (
        <p className="inventory-count">
          Mostrando {visible.length} de {products.length} productos
        </p>
      )}
    </div>
  );
}