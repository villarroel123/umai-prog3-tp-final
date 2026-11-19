'use client';

import { useRef, useState } from 'react';
import { money } from '@/lib/models';

export default function CreditNoteForm({ saleId, saleItems, initialNotes = [] }) {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const creditId = useRef(null);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const match = value.trim().match(/^(?:(\d+)\s*[x*]\s*)?(.+)$/i);
    const item = match && saleItems.find(row => String(row.code || '').toLowerCase() === match[2].trim().toLowerCase());
    if (!item) { setError('El código no pertenece a esta venta.'); return; }
    const alreadyReturned = notes.flatMap(note => note.items || []).filter(row => row.productId === item.productId).reduce((sum, row) => sum + row.quantity, 0);
    const quantity = match[1] ? Number(match[1]) : item.quantity - alreadyReturned;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity + alreadyReturned > item.quantity) { setError('La cantidad supera las unidades vendidas que siguen disponibles para devolución.'); return; }
    setBusy(true);
    try {
      creditId.current ||= crypto.randomUUID();
      const response = await fetch(`/api/sales/${saleId}/returns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creditId: creditId.current, reason, refundMethod, items: [{ productId: item.productId, quantity }] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la nota de crédito.');
      setNotes(current => [...current, data.creditNote]); setValue(''); setReason(''); creditId.current = null;
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  return <section className="void-form no-print">
    <div><span className="eyebrow">DEVOLUCIÓN / NOTA DE CRÉDITO</span><h2>Devolver productos de una venta</h2><p>El sistema repone el stock y registra el importe devuelto para el próximo cierre Z.</p></div>
    <form onSubmit={submit}>
      <label>Cantidad y código<input value={value} onChange={event => setValue(event.target.value)} required placeholder="2x7790001 o solo el código"/></label>
      <label>Medio de devolución<select value={refundMethod} onChange={event => setRefundMethod(event.target.value)}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select></label>
      <label>Motivo<input value={reason} onChange={event => setReason(event.target.value)} required minLength={3} maxLength={160}/></label>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="button-secondary">{busy ? 'Registrando...' : 'Registrar devolución'}</button>
    </form>
    {notes.length > 0 && <div className="credit-note-history"><strong>Notas de crédito</strong>{notes.map(note => <p key={note.id}>{money(note.total)} · {note.reason} · {new Date(note.createdAt).toLocaleString('es-AR')}</p>)}</div>}
  </section>;
}
