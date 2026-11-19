'use client';

import { useRef, useState } from 'react';

export default function CreditNoteForm({ sale, onSuccess }) {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const returnId = useRef(null);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const match = value.trim().match(/^(?:(\d+)\s*[x*]\s*)?(.+)$/i);
    const item = match && sale.items.find(row => String(row.code || '').toLowerCase() === match[2].trim().toLowerCase());
    if (!item) { setError('El código no pertenece a esta venta.'); return; }
    const remaining = item.quantity - (sale.returnedQuantities?.[item.productId] || 0);
    const quantity = match[1] ? Number(match[1]) : remaining;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > remaining) { setError('La cantidad supera las unidades pendientes de devolución.'); return; }
    setBusy(true);
    try {
      returnId.current ||= crypto.randomUUID();
      const response = await fetch(`/api/sales/${sale.id}/returns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnId: returnId.current, reason, method, items: [{ productId: item.productId, quantity }] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la devolución.');
      returnId.current = null;
      setValue(''); setReason('');
      await onSuccess?.();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  return <section className="void-form no-print">
    <div><span className="eyebrow">DEVOLUCIÓN</span><h2>Devolver productos</h2><p>Se repone el stock y se registra el reintegro en la caja abierta.</p></div>
    <form onSubmit={submit}>
      <label>Cantidad y código<input value={value} onChange={event => setValue(event.target.value)} required placeholder="2x7790001 o solo el código"/></label>
      <label>Medio de reintegro<select value={method} onChange={event => setMethod(event.target.value)}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select></label>
      <label>Motivo<input value={reason} onChange={event => setReason(event.target.value)} required minLength={5} maxLength={160}/></label>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="button-secondary">{busy ? 'Registrando...' : 'Registrar devolución'}</button>
    </form>
  </section>;
}
