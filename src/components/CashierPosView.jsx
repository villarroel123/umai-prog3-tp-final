'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Printer, Search, X } from 'lucide-react';
import { money, receiptCode } from '@/lib/models';
import PaymentArea from './PaymentArea';
import CashMovementModal from './CashMovementModal';
import CashierReturnDialog from './CashierReturnDialog';

const actions = [
  ['F1', 'Eliminar producto'],
  ['F2', 'Devolución de producto'],
  ['F3', 'Devolución total de cuenta'],
  ['F4', 'Ofertas y recargos'],
  ['F9', 'Volver a productos'],
  ['F10', 'Ir a cobro'],
];

export default function CashierPosView({ businessName, cashierName, session, products, visible, query, setQuery, scan, scanRef, pendingQuantity, scanNotice, error, setError, ticket, priced, itemCount, add, remove, quantity, saleAdjustment, setSaleAdjustment, setUnitPriceOverride, paymentProps, busy, loading, manageCash, assignedRegister, openingAmount, setOpeningAmount, openCash, closeCash, closingAmount, setClosingAmount, showClose, setShowClose, showMovement, setShowMovement, movementProps, lastSale, setLastSale, canAdjust = false, canReturn = false, refresh }) {
  const [selectedId, setSelectedId] = useState(null);
  const [clock, setClock] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState('discount');
  const [adjustPercent, setAdjustPercent] = useState('');
  const [returnMode, setReturnMode] = useState(null);
  const [overridePrice, setOverridePrice] = useState('');
  const [returnNotice, setReturnNotice] = useState('');
  const [openSetup, setOpenSetup] = useState(false);
  const paymentRef = useRef(null);

  useEffect(() => { const tick = () => setClock(new Date()); tick(); const timer = setInterval(tick, 30000); return () => clearInterval(timer); }, []);
  const selectedLine = ticket.find(line => line.productId === selectedId);
  const selectedProduct = products.find(product => product.id === selectedId);
  const lineByProduct = new Map(ticket.map(line => [line.productId, line]));

  function focusProducts() { setQuery(''); scanRef.current?.focus(); }
  function focusPayment() { paymentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); paymentRef.current?.querySelector('.cash-fields input, .payment-options button.selected, .payment-heading button')?.focus(); }
  function action(key) {
    if (key === 'F1') { if (selectedLine) remove(selectedLine.productId); else if (ticket.length) remove(ticket.at(-1).productId); }
    else if (key === 'F2' && canReturn) setReturnMode('item');
    else if (key === 'F3' && canReturn) setReturnMode('full');
    else if (key === 'F4' && canAdjust) { setAdjustType(saleAdjustment.type === 'none' ? 'discount' : saleAdjustment.type); setAdjustPercent(saleAdjustment.percent ? String(saleAdjustment.percent) : ''); setOverridePrice(selectedLine?.unitPriceOverride == null ? '' : String(selectedLine.unitPriceOverride)); setAdjustOpen(true); }
    else if (key === 'F9') focusProducts();
    else if (key === 'F10') focusPayment();
  }
  useEffect(() => {
    const onKeyDown = event => {
    if (event.altKey || event.ctrlKey || event.metaKey || busy) return;
      if (event.key === 'Escape' && (adjustOpen || returnMode || openSetup)) { event.preventDefault(); setAdjustOpen(false); setReturnMode(null); setOpenSetup(false); requestAnimationFrame(() => scanRef.current?.focus()); return; }
      if (adjustOpen || returnMode || openSetup || showClose || showMovement || lastSale) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !['F9', 'F10'].includes(event.key.toUpperCase())) return;
      const key = event.key.toUpperCase();
      if (!actions.some(([shortcut]) => shortcut === key)) return;
      if ((key === 'F2' || key === 'F3') && (!canReturn || !hasSession)) return;
      if (key === 'F4' && !canAdjust) return;
      event.preventDefault(); action(key);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  });

  const adjustedTotal = priced.saleAdjustmentAmount + priced.lineAdjustmentsTotal;
  const hasSession = Boolean(session);
  return <div className="demo-screen real-cashier" aria-label="Caja del cajero"><div className="demo-frame">
    <header className="demo-left-head"><div className="demo-bar"><strong className="demo-business">{businessName}</strong><span className="demo-spacer"/><div className="demo-chip">Cajero: <strong>{cashierName}</strong></div><div className="demo-chip demo-date">{clock ? clock.toLocaleDateString('es-AR') : '—'}</div><div className="demo-chip"><strong>{clock ? clock.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong></div></div>
      <div className="demo-shortcuts">{actions.map(([key, label]) => <button key={key} type="button" className="demo-shortcut" onClick={() => action(key)} disabled={busy || ((key === 'F1') && ticket.length === 0) || ((key === 'F2' || key === 'F3') && (!canReturn || !hasSession)) || (key === 'F4' && !canAdjust) || (key === 'F10' && !hasSession)} title={((key === 'F2' || key === 'F3') && (!canReturn || !hasSession)) || (key === 'F4' && !canAdjust) ? 'Requiere autorización del jefe de negocio' : undefined}><span className="demo-shortcut-key">{key}</span><span className="demo-shortcut-label">{label}</span></button>)}</div>
    </header>
    <section className="demo-grid" aria-label="Artículos"><div className="demo-search"><Search size={18}/><input ref={scanRef} autoFocus value={query} onChange={event => setQuery(event.target.value)} onKeyDown={scan} placeholder="Buscar por código o descripción (3x código para cantidad)" aria-label="Buscar por código o descripción" autoComplete="off" disabled={!hasSession || busy}/>{pendingQuantity && <span className="demo-pending">Cantidad: {pendingQuantity}</span>}</div><div className="demo-table-wrap" tabIndex={0}><table className="demo-table"><thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Importe</th></tr></thead><tbody>{visible.map(product => { const line = lineByProduct.get(product.id); const count = line?.quantity || 0; return <tr key={product.id} className={`${selectedId === product.id ? 'is-selected' : ''} ${count ? 'in-cart' : ''} ${product.stock <= 0 ? 'is-unavailable' : ''}`} onClick={() => { setSelectedId(product.id); if (hasSession && product.stock > count && !busy) add(product); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(product.id); if (hasSession && product.stock > count && !busy) add(product); } }} tabIndex={0} aria-label={`${product.name}, ${count} en el ticket, stock ${product.stock}`}><td>{product.barcode || product.code}</td><td>{product.name}</td><td>{count ? <span className="cashier-quantity" onClick={event => event.stopPropagation()}><button type="button" onClick={() => { setSelectedId(product.id); quantity(product.id, count - 1); }} aria-label={`Restar ${product.name}`}>−</button><span>{count}</span><button type="button" onClick={() => { setSelectedId(product.id); quantity(product.id, count + 1); }} disabled={count >= product.stock} aria-label={`Sumar ${product.name}`}>+</button></span> : <span className="demo-qty">0</span>}</td><td>{money(line?.unitPriceOverride ?? product.price)}</td><td>{money((line?.unitPriceOverride ?? product.price) * count)}</td></tr>; })}</tbody></table>{!loading && visible.length === 0 && <div className="cashier-table-empty">{products.length ? 'No encontramos productos con esa búsqueda.' : 'Todavía no hay productos cargados.'}</div>}</div></section>
    <aside className="demo-summary"><div className="demo-total"><span className="demo-total-label">Total a cobrar</span><strong className="demo-total-amount">{money(priced.total)}</strong><span className="demo-total-meta">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</span></div><div className="demo-payment" ref={paymentRef}>{manageCash && session && <div className="cashier-cash-controls"><button type="button" onClick={() => setShowMovement(true)}>Movimiento de efectivo</button><button type="button" onClick={() => setShowClose(true)}>Cerrar caja</button></div>}<PaymentArea {...paymentProps} cashierSummary={{ subtotal: priced.subtotal, saleAdjustmentAmount: adjustedTotal, adjustment: saleAdjustment }}/></div></aside>
  </div>
  {error && <div className="cashier-notice is-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Cerrar mensaje"><X size={16}/></button></div>}{!error && (scanNotice || returnNotice) && <div className="cashier-notice" role="status">{scanNotice || returnNotice}</div>}
  {!loading && !session && <div className="cashier-session-overlay"><div className="cashier-session-card"><strong>{!assignedRegister ? 'Necesitás una caja asignada' : manageCash ? 'Abrí tu caja para comenzar' : 'Todavía no hay un turno activo'}</strong><p>{!assignedRegister ? 'Pedile al jefe de negocio que te asigne una caja.' : manageCash ? `Caja asignada: ${assignedRegister}. Ingresá el fondo inicial para habilitar los cobros.` : 'Pedile al jefe de negocio que abra la caja asignada.'}</p>{manageCash && assignedRegister && <button type="button" className="cashier-primary" onClick={() => setOpenSetup(true)}>Abrir caja</button>}</div></div>}
  {openSetup && <div className="cashier-dialog-backdrop"><form className="cashier-dialog" onSubmit={event => { openCash(event); setOpenSetup(false); }}><div className="cashier-dialog-head"><h2>Abrir {assignedRegister}</h2><button type="button" onClick={() => setOpenSetup(false)} aria-label="Cerrar"><X size={18}/></button></div><label>Fondo inicial en efectivo<input type="number" min="0" step="0.01" value={openingAmount} onChange={event => setOpeningAmount(event.target.value)} required autoFocus/></label><button className="cashier-primary" disabled={busy}>Abrir caja</button></form></div>}
  {adjustOpen && <div className="cashier-dialog-backdrop"><form className="cashier-dialog" onSubmit={event => { event.preventDefault(); if (selectedLine && overridePrice !== '' && Number(overridePrice) <= 0) return; setSaleAdjustment({ type: adjustType, percent: Number(adjustPercent) }); if (selectedLine) setUnitPriceOverride(selectedLine.productId, overridePrice === '' ? null : overridePrice); setAdjustOpen(false); }}><div className="cashier-dialog-head"><h2>Ofertas y recargos</h2><button type="button" onClick={() => setAdjustOpen(false)} aria-label="Cerrar"><X size={18}/></button></div><label>Tipo<select value={adjustType} onChange={event => setAdjustType(event.target.value)}><option value="discount">Descuento</option><option value="surcharge">Recargo</option><option value="none">Sin ajuste</option></select></label><label>Porcentaje<input type="number" min="0" max="100" step="0.01" value={adjustPercent} onChange={event => setAdjustPercent(event.target.value)} disabled={adjustType === 'none'} required={adjustType !== 'none'}/></label>{selectedLine && <label>Precio puntual de {selectedProduct?.name}<input type="number" min="0.01" step="0.01" value={overridePrice} onChange={event => setOverridePrice(event.target.value)} placeholder={String(selectedProduct?.price || '')}/><small>Dejá vacío para mantener el precio de catálogo. Solo afecta a esta venta.</small></label>}<button className="cashier-primary">Aplicar al ticket</button></form></div>}
  {returnMode && <CashierReturnDialog mode={returnMode} close={() => setReturnMode(null)} onCompleted={record => { setReturnNotice(`Devolución registrada: ${money(record.amount)}. Reintegro por ${record.method === 'cash' ? 'efectivo' : record.method === 'card' ? 'tarjeta' : 'transferencia'}.`); void refresh().catch(() => setError('La devolución se guardó, pero no pudimos actualizar el stock. Recargá la página.')); }}/>} 

  {manageCash && showMovement && session && <CashMovementModal session={session} {...movementProps}/>}
  {manageCash && showClose && session && <div className="cashier-dialog-backdrop"><form className="cashier-dialog" onSubmit={closeCash}><div className="cashier-dialog-head"><h2>Cerrar {session.registerName}</h2><button type="button" onClick={() => setShowClose(false)} aria-label="Cerrar"><X size={18}/></button></div><p>Efectivo esperado: {money(session.openingAmount + session.cashSalesTotal + (session.cashAdjustmentsTotal || 0))}</p><label>Efectivo contado<input type="number" min="0" step="0.01" value={closingAmount} onChange={event => setClosingAmount(event.target.value)} required/></label><button className="cashier-primary" disabled={busy}>Confirmar cierre</button></form></div>}
  {lastSale && <div className="cashier-dialog-backdrop"><div className="cashier-dialog cashier-receipt"><div className="cashier-dialog-head"><h2>Cobro registrado <Check size={20}/></h2><button type="button" onClick={() => setLastSale(null)} aria-label="Cerrar"><X size={18}/></button></div><strong>Comprobante no fiscal · {receiptCode(lastSale.receiptNumber)}</strong><p>{lastSale.registerName} · {new Date(lastSale.createdAt).toLocaleString('es-AR')}</p><div>{lastSale.items.map(item => <p key={item.productId}>{item.quantity} × {item.name} <strong>{money(item.lineTotal)}</strong></p>)}</div><div className="cashier-receipt-total"><span>Total</span><strong>{money(lastSale.total)}</strong></div><div className="cashier-receipt-actions"><button type="button" onClick={() => window.print()}><Printer size={16}/> Imprimir</button><button type="button" className="cashier-primary" onClick={() => { setLastSale(null); requestAnimationFrame(() => scanRef.current?.focus()); }}>Nueva venta</button></div></div></div>}
  </div>;
}
