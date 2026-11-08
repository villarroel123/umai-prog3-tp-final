'use client';
import { useState } from 'react';
import { ChevronDown, Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import { ADJUSTMENT_LABELS } from '@/lib/billing';
import { money } from '@/lib/models';
import PaymentArea from './PaymentArea';

export default function TicketPanel({ session, customerName, lines, itemCount, priced, quantity, remove, clear, setLineAdjustment, saleAdjustment, setSaleAdjustment, paymentProps }) {
  const [expanded, setExpanded] = useState({});
  return <aside className="ticket-panel" aria-label="Ticket de venta">
    <div className="ticket-head"><div><span className="eyebrow">02 / TICKET ACTUAL</span><h2>Venta en curso</h2></div><span className="ticket-number">#{String(session.salesCount + 1).padStart(3, '0')}</span></div>
    <div className="ticket-customer"><span>Cliente</span><strong>{customerName || 'Consumidor final'}</strong><span>NOTA DE VENTA</span></div>
    <div className="ticket-meta"><span><ShoppingBasket size={15}/> {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</span><button type="button" disabled={!lines.length} onClick={clear}>Limpiar ticket</button></div>
    <div className="ticket-lines">{lines.length ? lines.map((line, index) => {
      const pricedLine = priced.items[index];
      const adjustment = line.adjustment || { type: 'none', percent: 0 };
      const open = Boolean(expanded[line.productId]);
      return <div className="ticket-line" key={line.productId}>
        <div className="ticket-line-top"><div><strong>{line.product.name}</strong><small>{line.product.barcode || line.product.code}</small></div><button type="button" onClick={() => remove(line.productId)} aria-label={`Quitar ${line.product.name}`}><Trash2 size={15}/></button></div>
        <div className="ticket-line-bottom"><span>{money(line.product.price)} c/u</span><div className="quantity-control"><button type="button" onClick={() => quantity(line.productId, line.quantity - 1)} aria-label={`Restar ${line.product.name}`} disabled={line.quantity <= 1}><Minus size={13}/></button><span>{line.quantity}</span><button type="button" onClick={() => quantity(line.productId, line.quantity + 1)} aria-label={`Sumar ${line.product.name}`} disabled={line.quantity >= line.product.stock}><Plus size={13}/></button></div><strong>{money(pricedLine.lineTotal)}</strong></div>
        <button type="button" className="line-adjustment-toggle" aria-expanded={open} onClick={() => setExpanded(current => ({ ...current, [line.productId]: !current[line.productId] }))}>{adjustment.type === 'none' ? 'Ajustes' : `${ADJUSTMENT_LABELS[adjustment.type]} ${adjustment.percent}%`} <ChevronDown size={13} className={open ? 'open' : ''}/></button>
        {open && <div className="line-adjustment"><select aria-label={`Ajuste de ${line.product.name}`} value={adjustment.type} onChange={event => setLineAdjustment(line.productId, { type: event.target.value, percent: event.target.value === 'none' ? 0 : 10 })}>{Object.entries(ADJUSTMENT_LABELS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select>{adjustment.type !== 'none' && <label><input type="number" min="0" max="100" step="0.01" value={adjustment.percent} onChange={event => setLineAdjustment(line.productId, { ...adjustment, percent: event.target.value })} aria-label={`Porcentaje de ${line.product.name}`}/> %</label>}</div>}
      </div>;
    }) : <div className="ticket-empty"><ShoppingBasket size={28}/><strong>El ticket está vacío</strong><span>Agregá un producto para empezar.</span></div>}</div>
    <div className="ticket-total"><div><span>Productos</span><strong>{money(priced.baseSubtotal)}</strong></div>{priced.lineAdjustmentsTotal !== 0 && <div><span>Ajustes en productos</span><strong>{money(priced.lineAdjustmentsTotal)}</strong></div>}<div><span>Subtotal</span><strong>{money(priced.subtotal)}</strong></div><div className="sale-adjustment"><select aria-label="Ajuste de la venta" value={saleAdjustment.type} onChange={event => setSaleAdjustment({ type: event.target.value, percent: event.target.value === 'none' ? 0 : 10 })}>{Object.entries(ADJUSTMENT_LABELS).map(([type, label]) => <option key={type} value={type}>{label} en venta</option>)}</select>{saleAdjustment.type !== 'none' && <label><input type="number" min="0" max="100" step="0.01" value={saleAdjustment.percent} onChange={event => setSaleAdjustment({ ...saleAdjustment, percent: event.target.value })} aria-label="Porcentaje de ajuste de venta"/> %</label>}<strong>{money(priced.saleAdjustmentAmount)}</strong></div><div className="total-row"><span>Total</span><strong>{money(priced.total)}</strong></div></div>
    <PaymentArea {...paymentProps}/>
  </aside>;
}
