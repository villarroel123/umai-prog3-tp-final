'use client';
import { ArrowRight, X } from 'lucide-react';
import { money } from '@/lib/models';

export default function CashMovementModal({ session, type, setType, amount, setAmount, note, setNote, busy, error, close, submit }) {
  const expected = session.openingAmount + session.cashSalesTotal + (session.cashAdjustmentsTotal || 0);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div className="modal" role="dialog" aria-modal="true" aria-label="Movimiento de efectivo">
    <div className="modal-head"><div><span className="eyebrow">CAJA / EFECTIVO</span><h2>Movimiento de caja</h2></div><button type="button" onClick={close} aria-label="Cerrar"><X size={20}/></button></div>
    <p>Registrá ingresos o retiros que no corresponden a una venta. Quedarán en el historial del turno.</p>
    <div className="close-summary"><span>Efectivo esperado ahora <strong>{money(expected)}</strong></span></div>
    <form onSubmit={submit}><label>Tipo<select value={type} onChange={event => setType(event.target.value)}><option value="in">Ingreso de efectivo</option><option value="out">Retiro de efectivo</option></select></label><label>Importe<input type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required/></label><label>Motivo<input value={note} onChange={event => setNote(event.target.value)} minLength={3} maxLength={160} placeholder="Ej. Cambio para la caja" required/></label>{error && <div className="alert-error" role="alert">{error}</div>}<button className="button-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar movimiento'} <ArrowRight size={17}/></button></form>
  </div></div>;
}
