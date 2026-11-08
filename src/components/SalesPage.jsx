'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ReceiptText, Search } from 'lucide-react';
import { money, PAYMENT_METHODS, receiptCode } from '@/lib/models';
import { filterSales, salesSummary } from '@/lib/sale-history';

export default function SalesPage({ admin = false, detailBase = '/ventas', cashHref = '/caja' }) {
  const [sales, setSales] = useState([]);
  const [filters, setFilters] = useState({ search: '', date: '', method: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/sales').then(response => response.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setSales(data.sales);
    }).catch(cause => setError(cause.message)).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => filterSales(sales, filters), [sales, filters]);
  const summary = useMemo(() => salesSummary(filtered), [filtered]);
  const title = 'Historial de ventas';
  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  return <div className="inner-page sales-page">
    <div className="page-top"><div><span className="eyebrow">{admin ? 'ADMINISTRACIÓN / VENTAS' : 'MI NEGOCIO / HISTORIAL'}</span><h1>{title}<span className="accent">.</span></h1><p>{admin ? 'Consultá las operaciones registradas en la plataforma.' : 'Consultá todas las operaciones de tu negocio.'}</p></div>{!admin && <Link href={cashHref} className="button-primary">Nueva venta <ArrowRight size={17}/></Link>}</div>
    {<div className="sales-filters" role="group" aria-label="Filtros de ventas"><label className="sales-search"><Search size={16}/><input type="search" value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Buscar número de ticket" aria-label="Buscar número de ticket"/></label><label>Fecha<input type="date" value={filters.date} onChange={event => updateFilter('date', event.target.value)}/></label><label>Medio<select value={filters.method} onChange={event => updateFilter('method', event.target.value)}><option value="">Todos los medios</option>{Object.entries(PAYMENT_METHODS).map(([method, label]) => <option key={method} value={method}>{label}</option>)}</select></label><label>Estado<select value={filters.status} onChange={event => updateFilter('status', event.target.value)}><option value="">Todos los estados</option><option value="completed">Completadas</option><option value="voided">Anuladas</option></select></label></div>}
    <div className="stats-grid sales-stats"><div><span>Total vendido</span><strong>{money(summary.total)}</strong><small>{filters.date ? 'En la fecha seleccionada' : 'En el período consultado'}</small></div><div><span>Operaciones</span><strong>{summary.count}</strong><small>Ventas completadas</small></div><div><span>Ticket promedio</span><strong>{money(summary.average)}</strong><small>Sobre operaciones completadas</small></div></div>
    {loading ? <div className="data-empty">Cargando ventas...</div> : error ? <div className="alert-error" role="alert">{error}</div> : !sales.length ? <div className="history-empty"><ReceiptText size={35}/><h2>Todavía no hay ventas registradas.</h2><p>Las operaciones van a aparecer en este historial.</p>{!admin && <Link href={cashHref} className="button-primary">Ir a caja <ArrowRight size={16}/></Link>}</div> : !filtered.length ? <div className="data-empty">No hay operaciones que coincidan con los filtros.</div> : <><div className="sales-result-count">{filtered.length} {filtered.length === 1 ? 'operación' : 'operaciones'} en el período</div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Ticket</th><th>Fecha y hora</th><th>{admin ? 'Negocio' : 'Cliente'}</th><th>Artículos</th><th>Medio de pago</th><th>Importe total</th><th>Estado</th><th></th></tr></thead><tbody>{filtered.map(sale => <tr key={sale.id}><td><strong>{receiptCode(sale.receiptNumber)}</strong><small>{sale.registerName}</small></td><td>{new Date(sale.createdAt).toLocaleString('es-AR')}</td><td>{admin ? sale.businessName || 'Negocio' : sale.buyerName || 'Consumidor final'}</td><td>{(sale.items || []).reduce((sum, item) => sum + item.quantity, 0)}</td><td><span className="payment-tag">{PAYMENT_METHODS[sale.paymentMethod] || 'Cobro'}</span></td><td><strong>{money(sale.total)}</strong></td><td><span className={`status-pill ${sale.status === 'voided' ? 'voided' : 'completed'}`}>{sale.status === 'voided' ? 'Anulada' : 'Completada'}</span></td><td><Link className="table-action" href={`${detailBase}/${sale.id}`}>Ver detalle <ArrowRight size={15}/></Link></td></tr>)}</tbody></table></div></>}
  </div>;
}
