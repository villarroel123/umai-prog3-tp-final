'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Printer } from 'lucide-react';
import { money, PAYMENT_METHODS, receiptCode } from '@/lib/models';
import SalePrint from './SalePrint';

export default function SaleDetail({ id, backHref = '/ventas', canVoid = false }) {
  const [sale, setSale] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  useEffect(() => { fetch(`/api/sales/${id}`).then(response => response.json()).then(data => { if (data.error) throw new Error(data.error); setSale(data.sale); }).catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, [id]);
  async function voidSale(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch(`/api/sales/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSale(data.sale); setReason('');
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  return <div className="inner-page detail-page"><Link href={backHref} className="back-link"><ArrowLeft size={16}/> Volver al historial</Link>
    {sale && <SalePrint sale={sale}/>}
    {loading ? <div className="data-empty">Cargando comprobante...</div> : !sale ? <div className="alert-error" role="alert">{error || 'No encontramos la venta.'}</div> : <><div className="page-top"><div><span className="eyebrow">NOTA DE VENTA / {receiptCode(sale.receiptNumber)}</span><h1>Detalle de venta<span className="accent">.</span></h1><p>Registrada el {new Date(sale.createdAt).toLocaleString('es-AR')}.</p><span className={`status-pill ${sale.status === 'voided' ? 'voided' : 'completed'}`}>{sale.status === 'voided' ? 'Anulada' : 'Completada'}</span></div><button className="button-primary no-print" onClick={() => window.print()}><Printer size={17}/> Imprimir</button></div>{error && <div className="alert-error" role="alert">{error}</div>}
      {sale.status === 'voided' && <div className="void-notice"><strong>Venta anulada</strong><span>Motivo: {sale.voidReason}</span><small>{sale.voidedAt && new Date(sale.voidedAt).toLocaleString('es-AR')}</small></div>}
      <div className="detail-grid"><div className="detail-card"><div className="detail-card-head"><span className="eyebrow">PRODUCTOS</span><span>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} artículos</span></div><div className="detail-items">{sale.items.map(item => <div key={item.productId}><div><strong>{item.name}</strong><small>{item.code} · {item.quantity} × {money(item.unitPrice)}</small>{item.adjustment?.type !== 'none' && item.adjustment?.percent > 0 && <small>{item.adjustment.type === 'discount' ? 'Descuento' : 'Recargo'} {item.adjustment.percent}%: {money(item.adjustmentAmount)}</small>}</div><strong>{money(item.lineTotal)}</strong></div>)}</div>{(sale.lineAdjustmentsTotal !== 0 || sale.saleAdjustmentAmount !== 0) && <div className="detail-adjustments"><span>Productos <strong>{money(sale.baseSubtotal ?? sale.subtotal ?? sale.total)}</strong></span>{sale.lineAdjustmentsTotal !== 0 && <span>Ajustes por producto <strong>{money(sale.lineAdjustmentsTotal)}</strong></span>}{sale.saleAdjustmentAmount !== 0 && <span>{sale.adjustment?.type === 'discount' ? 'Descuento' : 'Recargo'} de venta ({sale.adjustment?.percent}%) <strong>{money(sale.saleAdjustmentAmount)}</strong></span>}</div>}<div className="detail-total"><span>TOTAL</span><strong>{money(sale.total)}</strong></div></div><div className="detail-card detail-payment"><div className="paid-icon"><Check size={22}/></div><span className="eyebrow">PAGO REGISTRADO</span><h2>{PAYMENT_METHODS[sale.paymentMethod]}</h2><p>La tarjeta y la transferencia se registran manualmente; caja. no procesa ni verifica esos pagos.</p>{(sale.payments || [{ method: sale.paymentMethod, amount: sale.total }]).map((payment, index) => <div key={index}><span>{PAYMENT_METHODS[payment.method]}{payment.reference && <small>Ref. {payment.reference}</small>}</span><strong>{money(payment.amount)}</strong></div>)}{sale.payments?.some(payment => payment.method === 'cash') && <div><span>Efectivo recibido</span><strong>{money(sale.amountReceived)}</strong></div>}{sale.change > 0 && <div><span>Vuelto</span><strong>{money(sale.change)}</strong></div>}<div><span>Negocio</span><strong>{sale.businessName || 'Negocio'}</strong></div><div><span>Caja</span><strong>{sale.registerName}</strong></div><div><span>Operador</span><strong>{sale.cashierName || '—'}</strong></div><div><span>Comprador</span><strong>{sale.buyerName}</strong></div></div></div>
      {canVoid && sale.status !== 'voided' && <form className="void-form no-print" onSubmit={voidSale}><div><span className="eyebrow">CORRECCIÓN</span><h2>Anular venta</h2><p>Resta el cobro de la caja y devuelve las unidades al stock. La operación queda visible en el historial. Si hubo un pago externo, gestioná su devolución por separado.</p></div><label>Motivo de anulación<input value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={160} required placeholder="Ej. Error al cargar productos"/></label><button type="submit" disabled={busy} className="button-secondary">{busy ? 'Anulando...' : 'Confirmar anulación'}</button></form>}
    </>}
  </div>;
}
