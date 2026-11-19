'use client';
import { useEffect, useState } from 'react';
import { netSaleTotal } from '@/lib/sale-history';
const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
export default function CashierShift() {
  const [session, setSession] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([fetch('/api/cash-sessions', { cache: 'no-store' }), fetch('/api/sales', { cache: 'no-store' })]).then(async ([sessionResponse, salesResponse]) => { const [sessionData, salesData] = await Promise.all([sessionResponse.json(), salesResponse.json()]); if (!sessionResponse.ok || !salesResponse.ok) throw new Error(sessionData.error || salesData.error || 'No se pudo cargar el turno.'); setSession(sessionData.session); setSales(salesData.sales || []); }).catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, []);
  const ownSales = session ? sales.filter(sale => sale.cashSessionId === session.id && ['completed', 'partially_returned'].includes(sale.status)) : [];
  return <div className="inner-page"><div className="section-bar"><h1>Mi turno</h1></div>{error && <div className="alert-error" role="alert">{error}</div>}{loading ? <div className="data-empty">Cargando turno...</div> : !session ? <div className="data-empty">No hay una caja abierta para tu puesto. Pedile al jefe de negocio que abra un turno.</div> : <><div className="cashiers-toolbar"><div><strong>{session.registerName}</strong><p>Abierta el {new Date(session.openedAt).toLocaleString('es-AR')}</p></div><div><strong>{ownSales.length} ventas propias</strong><p>Total cobrado por vos: {money(ownSales.reduce((sum, sale) => sum + netSaleTotal(sale), 0))}</p></div></div><div className="cashiers-table-wrap"><table className="cashiers-table"><thead><tr><th>Ticket</th><th>Fecha</th><th>Medio de pago</th><th>Importe</th></tr></thead><tbody>{ownSales.map(sale => <tr key={sale.id}><td>#{sale.receiptNumber}</td><td>{new Date(sale.createdAt).toLocaleString('es-AR')}</td><td>{sale.paymentMethod === 'mixed' ? 'Dividido' : sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</td><td>{money(netSaleTotal(sale))}</td></tr>)}</tbody></table>{ownSales.length === 0 && <div className="data-empty">Todavía no registraste ventas en este turno.</div>}</div></>}</div>;
}
