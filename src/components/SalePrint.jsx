import { money, PAYMENT_METHODS, receiptCode } from '@/lib/models';

export default function SalePrint({ sale }) {
  return <section className="sale-print" aria-label="Comprobante no fiscal para imprimir">
    <h2>{sale.businessName || 'Negocio'}</h2>
    <p>COMPROBANTE NO FISCAL<br/>{receiptCode(sale.receiptNumber)} · {new Date(sale.createdAt).toLocaleString('es-AR')}</p>
    <p>{sale.registerName} · Operador: {sale.cashierName || '—'}<br/>Cliente: {sale.buyerName || 'Consumidor final'}</p>
    <div className="sale-print-lines">{sale.items.map(item => <div key={item.productId}><span>{item.quantity} × {item.name}<small>{money(item.unitPrice)} c/u{item.adjustment?.type !== 'none' && item.adjustment?.percent > 0 ? ` · ${item.adjustment.type === 'discount' ? 'Descuento' : 'Recargo'} ${item.adjustment.percent}%` : ''}</small></span><strong>{money(item.lineTotal)}</strong></div>)}</div>
    {sale.saleAdjustmentAmount !== 0 && <div className="sale-print-row"><span>{sale.adjustment?.type === 'discount' ? 'Descuento' : 'Recargo'} de venta</span><strong>{money(sale.saleAdjustmentAmount)}</strong></div>}
    <div className="sale-print-total"><span>TOTAL</span><strong>{money(sale.total)}</strong></div>
    {(sale.payments || [{ method: sale.paymentMethod, amount: sale.total }]).map((payment, index) => <div className="sale-print-row" key={index}><span>{PAYMENT_METHODS[payment.method]}{payment.reference ? ` · Ref. ${payment.reference}` : ''}</span><strong>{money(payment.amount)}</strong></div>)}
    {sale.payments?.some(payment => payment.method === 'cash') && <div className="sale-print-row"><span>Recibido / Vuelto</span><strong>{money(sale.amountReceived)} / {money(sale.change)}</strong></div>}
    {sale.status === 'voided' && <p className="sale-print-void">VENTA ANULADA · {sale.voidReason}</p>}
    <p className="sale-print-foot">Registro interno de venta. No es factura ni comprobante fiscal.</p>
  </section>;
}
