'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, PackagePlus, ReceiptText, TrendingUp } from 'lucide-react';
import { money, PAYMENT_METHODS, receiptCode } from '@/lib/models';
import { buildOverview } from '@/lib/overview';
import SalesChart from './SalesChart';

function RecentSaleRow({ sale }) {
  const content = <><span className="overview-receipt-icon"><ReceiptText size={18}/></span><span className="overview-recent-info"><strong>{receiptCode(sale.receiptNumber)} · {sale.buyerName || 'Consumidor final'}</strong><small>{new Date(sale.createdAt).toLocaleString('es-AR')} · {PAYMENT_METHODS[sale.paymentMethod] || 'Pago'}</small></span><span className="overview-recent-amount"><strong>{money(sale.total)}</strong>{sale.status === 'voided' && <small>Anulada</small>}</span><ArrowUpRight size={16}/></>;
  return <Link href={`/panel/ventas/${sale.id}`}>{content}</Link>;
}

export default function BusinessDashboard({ businessName, userName }) {
  const [sales, setSales] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setToday(new Date());
    fetch('/api/sales').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las ventas.');
      return data;
    }).then(data => setSales(data.sales)).catch(cause => setError(cause.message)).finally(() => setLoading(false));
  }, []);
  const overview = useMemo(() => {
    if (!today) return null;
    return buildOverview(sales, today);
  }, [sales, today]);
  const firstName = userName.split(' ')[0];
  return <div className="overview-page">
    <div className="overview-heading"><div><span className="eyebrow">PANEL / RESUMEN</span><h1>{businessName}<span className="accent">.</span></h1><p>Hola, {firstName}. Acá tenés el movimiento de tu negocio.</p></div><div className="overview-heading-actions"><span className="overview-date"><CalendarDays size={16}/>{today ? today.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha de hoy'}</span></div></div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    {loading || !overview ? <div className="overview-loading">Cargando el resumen del negocio...</div> : <>
      <div className="overview-metrics"><div className="overview-metric featured"><span>VENDIDO HOY</span><strong>{money(overview.todayTotal)}</strong><small>{overview.todayCount ? 'Ventas confirmadas de hoy' : 'Todavía no hay ventas hoy'}</small><TrendingUp size={21}/></div><div className="overview-metric"><span>VENTAS REALIZADAS</span><strong>{overview.todayCount}</strong><small>Durante el día de hoy</small></div><div className="overview-metric"><span>TICKET PROMEDIO</span><strong>{money(overview.averageTicket)}</strong><small>Sobre las ventas de hoy</small></div></div>
      <div className="overview-grid"><section className="overview-card overview-sales"><div className="overview-card-heading"><div><span className="eyebrow">ÚLTIMOS 7 DÍAS</span><h2>Ritmo de ventas</h2></div><span className="overview-card-tag">Ventas confirmadas</span></div><SalesChart days={overview.days}/></section><section className="overview-card overview-top"><div className="overview-card-heading"><div><span className="eyebrow">ÚLTIMOS 7 DÍAS</span><h2>Más vendidos</h2></div></div>{overview.topProducts.length ? <div className="overview-top-list">{overview.topProducts.map((product, index) => <div key={product.id}><span className="overview-top-index">{String(index + 1).padStart(2, '0')}</span><span className="overview-top-name"><strong>{product.name}</strong><small>{product.quantity} unidades</small></span><strong>{money(product.total)}</strong></div>)}</div> : <div className="overview-empty"><PackagePlus size={28}/><strong>Sin productos vendidos todavía</strong><span>Cuando registres ventas, aparecerán acá.</span></div>}</section></div>
      <div className="overview-bottom"><section className="overview-card"><div className="overview-card-heading"><div><span className="eyebrow">ACTIVIDAD RECIENTE</span><h2>Últimas ventas</h2></div><Link href="/panel/ventas" className="quiet-link">Ver todas <ArrowRight size={15}/></Link></div>{overview.latestSales.length ? <div className="overview-recent">{overview.latestSales.map(sale => <RecentSaleRow key={sale.id} sale={sale}/>)}</div> : <div className="overview-empty"><ReceiptText size={28}/><strong>No hay ventas registradas</strong><span>Tu primera operación aparecerá en este espacio.</span></div>}</section><section className="overview-card overview-actions"><div className="overview-card-heading"><div><span className="eyebrow">ACCESOS DIRECTOS</span><h2>Acciones rápidas</h2></div></div><Link href="/panel/ventas"><ReceiptText size={18}/><span>Consultar historial</span><ArrowRight size={17}/></Link></section></div>
    </>}
  </div>;
}
