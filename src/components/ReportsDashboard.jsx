'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { money, PAYMENT_METHODS, receiptCode } from '@/lib/models';
import { filterSales, salesCsv, summarizeSales } from '@/lib/reports';

export default function ReportsDashboard({ admin = false }) {
  const [sales, setSales] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', product: '', payment: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/sales').then(response => response.json()).then(data => { if (data.error) throw new Error(data.error); setSales(data.sales); }).catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => filterSales(sales, filters), [sales, filters]);
  const summary = useMemo(() => summarizeSales(filtered), [filtered]);
  function setFilter(key, value) { setFilters(current => ({ ...current, [key]: value })); }
  function download() {
    const blob = new Blob([salesCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="inner-page operations-page"><div className="page-top"><div><span className="eyebrow">{admin ? 'ADMINISTRACIÓN' : 'MI NEGOCIO'} / REPORTES</span><h1>Los números, claros<span className="accent">.</span></h1><p>Filtrá ventas y descargá el detalle para analizar tu operación.</p></div><button type="button" className="button-primary" onClick={download} disabled={loading || !filtered.length}><Download size={17}/> Descargar CSV</button></div>
    <div className="report-filters"><label>Desde<input type="date" value={filters.from} onChange={event => setFilter('from', event.target.value)}/></label><label>Hasta<input type="date" value={filters.to} min={filters.from || undefined} onChange={event => setFilter('to', event.target.value)}/></label><label>Producto o código<input value={filters.product} onChange={event => setFilter('product', event.target.value)} placeholder="Buscar en ventas"/></label><label>Medio de pago<select value={filters.payment} onChange={event => setFilter('payment', event.target.value)}><option value="">Todos</option>{Object.entries(PAYMENT_METHODS).filter(([key]) => key !== 'mixed').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    {loading ? <div className="data-empty">Cargando reportes...</div> : <><div className="report-metrics"><div><span>Ventas válidas</span><strong>{summary.count}</strong></div><div><span>Total cobrado</span><strong>{money(summary.total)}</strong></div><div><span>Ticket promedio</span><strong>{money(summary.count ? summary.total / summary.count : 0)}</strong></div><div><span>Anuladas</span><strong>{summary.voidCount}</strong></div></div><div className="report-breakdown"><section><span className="eyebrow">MEDIOS DE PAGO</span><h2>Cómo se cobró</h2>{Object.entries(summary.paymentTotals).map(([method, amount]) => <div className="report-line" key={method}><span>{PAYMENT_METHODS[method]}</span><strong>{money(amount)}</strong></div>)}</section><section><span className="eyebrow">PRODUCTOS</span><h2>Más vendidos</h2>{summary.products.length ? summary.products.map(product => <div className="report-line" key={product.name}><span>{product.name} <small>× {product.quantity}</small></span><strong>{money(product.total)}</strong></div>) : <p>Sin productos en este período.</p>}</section></div><div className="report-table-head"><h2>Operaciones filtradas</h2><span>{filtered.length} registros</span></div>{filtered.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Comprobante</th><th>Fecha</th><th>Comprador</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody>{filtered.map(sale => <tr key={sale.id}><td>{receiptCode(sale.receiptNumber)}</td><td>{new Date(sale.createdAt).toLocaleString('es-AR')}</td><td>{admin ? sale.businessName : sale.buyerName}</td><td><span className={`status-pill ${sale.status === 'voided' ? 'voided' : 'completed'}`}>{sale.status === 'voided' ? 'Anulada' : 'Completada'}</span></td><td>{money(sale.total)}</td><td><Link className="table-action" href={`/ventas/${sale.id}`}>Ver detalle</Link></td></tr>)}</tbody></table></div> : <div className="data-empty">No hay ventas para estos filtros.</div>}</>}
  </div>;
}
