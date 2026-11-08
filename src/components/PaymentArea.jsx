'use client';
import { ArrowRight, Banknote, CreditCard, Plus, Trash2, Wallet } from 'lucide-react';
import { money, PAYMENT_METHODS } from '@/lib/models';

export default function PaymentArea({ splitPayment, setSplitPayment, paymentMethod, setPaymentMethod, paymentRows, setPaymentRows, paymentReference, setPaymentReference, transferConfirmed, setTransferConfirmed, amountReceived, setAmountReceived, customerName, setCustomerName, total, paymentsTotal, cashPortion, change, paymentReady, checkout, busy, hasItems }) {
  function updateRow(index, patch) { if (patch.method !== undefined) setTransferConfirmed(false); setPaymentRows(rows => rows.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  return <div className="payment-block">
    <div className="payment-details">
    <span className="eyebrow">03 / COBRO</span>
    <div className="payment-heading"><h3>Medios de cobro</h3><button type="button" onClick={() => { setSplitPayment(value => !value); setTransferConfirmed(false); }}>{splitPayment ? 'Cobro simple' : 'Dividir pago'}</button></div>
    {splitPayment ? <div className="split-payments">
      {paymentRows.map((row, index) => <div className="split-row" key={index}>
        <label>Medio<select value={row.method} onChange={e => updateRow(index, { method: e.target.value })}>{Object.entries(PAYMENT_METHODS).filter(([method]) => method !== 'mixed').map(([method, label]) => <option key={method} value={method}>{label}</option>)}</select></label>
        <label>Importe<input type="number" min="0.01" step="0.01" value={row.amount} onChange={e => updateRow(index, { amount: e.target.value })} placeholder="0,00"/></label>
        <button type="button" onClick={() => setPaymentRows(rows => rows.filter((_, i) => i !== index))} disabled={paymentRows.length <= 2} aria-label={`Quitar medio ${index + 1}`}><Trash2 size={15}/></button>
        {row.method !== 'cash' && <label className="payment-reference">Referencia opcional<input value={row.reference || ''} maxLength={120} onChange={e => updateRow(index, { reference: e.target.value })} placeholder="N.º de operación"/></label>}
      </div>)}
      {paymentRows.length < 5 && <button type="button" className="add-payment" onClick={() => setPaymentRows(rows => [...rows, { method: 'cash', amount: '', reference: '' }])}><Plus size={15}/> Agregar medio</button>}
      <div className="split-total"><span>Asignado {money(paymentsTotal)} de {money(total)}</span><strong>{paymentsTotal === total ? 'Total cubierto' : paymentsTotal > total ? `Excede ${money(paymentsTotal - total)}` : `Faltan ${money(total - paymentsTotal)}`}</strong></div>
    </div> : <div className="payment-options">{Object.entries(PAYMENT_METHODS).filter(([method]) => method !== 'mixed').map(([method, label]) => <button type="button" key={method} className={paymentMethod === method ? 'selected' : ''} onClick={() => { setPaymentMethod(method); setTransferConfirmed(false); }}>{method === 'cash' ? <Banknote size={18}/> : method === 'card' ? <CreditCard size={18}/> : <Wallet size={18}/>}<span>{label}</span></button>)}</div>}
    {!splitPayment && paymentMethod !== 'cash' && <label className="payment-reference">Referencia de operación (opcional)<input value={paymentReference} maxLength={120} onChange={e => setPaymentReference(e.target.value)} placeholder="N.º de operación"/></label>}
    {cashPortion > 0 && <div className="cash-fields"><label>Efectivo recibido<input type="number" min="0" step="0.01" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} placeholder="$ 0,00"/></label><div><span>Vuelto</span><strong>{money(change)}</strong></div></div>}
    {cashPortion > 0 && amountReceived !== '' && Number(amountReceived) < cashPortion && <p className="payment-warning" role="status">El efectivo recibido no alcanza para cubrir {money(cashPortion)}.</p>}
    {(splitPayment ? paymentRows.some(row => row.method === 'transfer' && Number(row.amount) > 0) : paymentMethod === 'transfer') && <label className="transfer-confirmation"><input type="checkbox" checked={transferConfirmed} onChange={e => setTransferConfirmed(e.target.checked)}/><span>Confirmo que recibí la transferencia. caja. no la verifica automáticamente.</span></label>}
    <label className="payment-reference">Cliente (opcional)<input value={customerName} maxLength={80} onChange={event => setCustomerName(event.target.value)} placeholder="Consumidor final"/></label>
    </div>
    <div className="payment-footer">
    <button type="button" className="charge-button" onClick={checkout} disabled={busy || !hasItems || !paymentReady}>{busy ? 'Registrando...' : 'Finalizar cobro'} <ArrowRight size={18}/></button>
    <p className="payment-disclaimer">Comprobante no fiscal. Los pagos externos se registran manualmente.</p>
    </div>
  </div>;
}
