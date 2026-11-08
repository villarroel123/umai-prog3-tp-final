'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { money } from '@/lib/models';

export default function CashHistory() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/cash-sessions?history=1').then(response => response.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setSessions(data.sessions);
    }).catch(cause => setError(cause.message)).finally(() => setLoading(false));
  }, []);
  async function select(session) {
    setSelected(session); setMovements([]); setError('');
    try {
      const response = await fetch(`/api/cash-movements?sessionId=${encodeURIComponent(session.id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMovements(data.movements);
    } catch (cause) { setError(cause.message); }
  }
  return <div className="inner-page operations-page">
    <div className="page-top"><div><span className="eyebrow">MI NEGOCIO / CAJA</span><h1>Cierres de caja<span className="accent">.</span></h1><p>Revisá cada turno, el efectivo esperado y los movimientos registrados.</p></div><Link href="/caja" className="button-primary">Ir a caja <ArrowRight size={17}/></Link></div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    {loading ? <div className="data-empty">Cargando turnos...</div> : !sessions.length ? <div className="history-empty"><Wallet size={34}/><h2>Todavía no hay cajas.</h2><p>Cuando abras una caja, su actividad aparecerá acá.</p></div> : <div className="operations-layout"><div className="operations-list">{sessions.map(session => <button type="button" key={session.id} className={`operation-card ${selected?.id === session.id ? 'selected' : ''}`} onClick={() => select(session)}><span className="operation-card-top"><strong>{session.registerName}</strong><span className={`status-pill ${session.status}`}>{session.status === 'open' ? 'Abierta' : 'Cerrada'}</span></span><small>{session.businessName} · {new Date(session.openedAt).toLocaleString('es-AR')}</small><span>Ventas netas <strong>{money(session.grossTotal)}</strong></span><span>Efectivo esperado <strong>{money(session.expectedClosingAmount ?? session.openingAmount + session.cashSalesTotal + (session.cashAdjustmentsTotal || 0))}</strong></span></button>)}</div><div className="operation-detail">{selected ? <><span className="eyebrow">DETALLE DEL TURNO</span><h2>{selected.registerName}</h2><div className="operation-figures"><span>Fondo inicial <strong>{money(selected.openingAmount)}</strong></span><span>Cobros en efectivo <strong>{money(selected.cashSalesTotal)}</strong></span><span>Ingresos y retiros <strong>{money(selected.cashAdjustmentsTotal || 0)}</strong></span><span>Ventas válidas <strong>{selected.salesCount}</strong></span><span>Ventas anuladas <strong>{selected.voidCount || 0}</strong></span><span>Esperado <strong>{money(selected.expectedClosingAmount ?? selected.openingAmount + selected.cashSalesTotal + (selected.cashAdjustmentsTotal || 0))}</strong></span>{selected.status === 'closed' && <><span>Contado <strong>{money(selected.closingAmount)}</strong></span><span>Diferencia <strong>{money(selected.difference)}</strong></span></>}</div><h3>Movimientos de efectivo</h3>{movements.length ? <div className="movement-list">{movements.map(movement => <div key={movement.id}><span className={movement.type === 'in' ? 'movement-in' : 'movement-out'}>{movement.type === 'in' ? 'Ingreso' : 'Retiro'}</span><strong>{money(movement.type === 'in' ? movement.amount : -movement.amount)}</strong><small>{movement.note} · {new Date(movement.createdAt).toLocaleString('es-AR')}</small></div>)}</div> : <p>Sin movimientos registrados.</p>}</> : <div className="operation-placeholder"><Wallet size={32}/><h2>Elegí una caja</h2><p>Vas a ver su cierre y todos los movimientos.</p></div>}</div></div>}
  </div>;
}
