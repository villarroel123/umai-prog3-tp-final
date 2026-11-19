'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { money, receiptCode } from '@/lib/models';

export default function CashierReturnDialog({ mode, close, onCompleted }) {
  const [receipt, setReceipt] = useState('');
  const [sale, setSale] = useState(null);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [returnId, setReturnId] = useState(null);

  async function find(event) {
    event.preventDefault(); setError(''); setBusy(true); setSale(null);
    try {
      const number = Number(receipt.replace(/\D/g, ''));
      if (!Number.isSafeInteger(number) || number < 1) throw new Error('Ingresá un número de comprobante válido.');
      const response = await fetch(`/api/sale-returns?receipt=${number}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se encontró el comprobante.');
      if (!['completed', 'partially_returned'].includes(data.sale.status)) throw new Error('La venta ya fue devuelta o anulada.');
      setSale(data.sale); setProductId(data.sale.items.find(item => (data.sale.returnedQuantities?.[item.productId] || 0) < item.quantity)?.productId || ''); setQuantity(1);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  async function submit(event) {
    event.preventDefault(); setError('');
    const items = mode === 'full'
      ? sale.items.map(item => ({ productId: item.productId, quantity: item.quantity - (sale.returnedQuantities?.[item.productId] || 0) })).filter(item => item.quantity > 0)
      : [{ productId, quantity: Number(quantity) }];
    if (!items.length) { setError('No hay artículos pendientes de devolución.'); return; }
    if (!window.confirm(`Confirmar la devolución de ${items.reduce((sum, item) => sum + item.quantity, 0)} artículo(s) del comprobante ${receiptCode(sale.receiptNumber)}?`)) return;
    setBusy(true);
    try {
      const id = returnId || crypto.randomUUID();
      setReturnId(id);
      const response = await fetch('/api/sale-returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnId: id, saleId: sale.id, items, reason, method }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la devolución.');
      onCompleted(data.saleReturn);
      close();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  return <div className="cashier-dialog-backdrop"><div className="cashier-dialog cashier-return-dialog" role="dialog" aria-modal="true" aria-label={mode === 'full' ? 'Devolución total' : 'Devolución de producto'}><div className="cashier-dialog-head"><h2>{mode === 'full' ? 'Devolución total' : 'Devolución de producto'}</h2><button type="button" onClick={close} aria-label="Cerrar"><X size={18}/></button></div><p>Buscá el comprobante original. La devolución se registra en la caja abierta actualmente.</p><form onSubmit={find} className="cashier-return-search"><label>Número de comprobante<input value={receipt} onChange={event => { setReceipt(event.target.value); setReturnId(null); }} placeholder="Ej. 000123" inputMode="numeric" required autoFocus/></label><button type="submit" disabled={busy}>Buscar</button></form>{sale && <form onSubmit={submit} className="cashier-return-form"><strong>{receiptCode(sale.receiptNumber)} · {sale.buyerName || 'Consumidor final'} · {money(sale.total)}</strong>{mode === 'item' ? <><label>Artículo<select value={productId} onChange={event => { setProductId(event.target.value); setQuantity(1); setReturnId(null); }}>{sale.items.filter(item => (sale.returnedQuantities?.[item.productId] || 0) < item.quantity).map(item => <option key={item.productId} value={item.productId}>{item.name} · quedan {item.quantity - (sale.returnedQuantities?.[item.productId] || 0)}</option>)}</select></label><label>Cantidad<input type="number" min="1" max={sale.items.find(item => item.productId === productId)?.quantity - (sale.returnedQuantities?.[productId] || 0) || 1} value={quantity} onChange={event => { setQuantity(event.target.value); setReturnId(null); }} required/></label></> : <div className="cashier-return-items">{sale.items.filter(item => item.quantity - (sale.returnedQuantities?.[item.productId] || 0) > 0).map(item => <span key={item.productId}>{item.quantity - (sale.returnedQuantities?.[item.productId] || 0)} × {item.name}</span>)}</div>}<label>Medio de reintegro<select value={method} onChange={event => { setMethod(event.target.value); setReturnId(null); }}><option value="cash">Efectivo</option><option value="card">Tarjeta (registrar reintegro externo)</option><option value="transfer">Transferencia (registrar reintegro externo)</option></select></label><label>Motivo<input value={reason} onChange={event => { setReason(event.target.value); setReturnId(null); }} minLength={5} maxLength={160} required placeholder="Ej. Producto defectuoso"/></label><button className="cashier-primary" disabled={busy}>{busy ? 'Registrando...' : 'Confirmar devolución'}</button></form>}{error && <p className="cashier-return-error" role="alert">{error}</p>}</div></div>;
}
