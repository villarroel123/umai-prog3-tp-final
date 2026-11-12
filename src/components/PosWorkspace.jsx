'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Barcode, Check, ChevronDown, Clock3, Plus, Printer, Search, Wallet, X } from 'lucide-react';
import { money, PAYMENT_METHODS, receiptCode, roundMoney } from '@/lib/models';
import { priceTicket } from '@/lib/billing';
import TicketPanel from './TicketPanel';
import CashMovementModal from './CashMovementModal';
import ProductThumb from './ProductThumb';

export default function PosWorkspace({ insidePanel = false, cashier = false }) {
  const [products, setProducts] = useState([]);
  const [savedRegisters, setSavedRegisters] = useState([]);
  const [session, setSession] = useState(null);
  const [ticket, setTicket] = useState([]);
  const [saleAdjustment, setSaleAdjustment] = useState({ type: 'none', percent: 0 });
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('Todos');
  const [paymentMethod, setPaymentMethod] = useState('cash'); const [splitPayment, setSplitPayment] = useState(false); const [paymentRows, setPaymentRows] = useState([{ method: 'cash', amount: '', reference: '' }, { method: 'card', amount: '', reference: '' }]); const [paymentReference, setPaymentReference] = useState(''); const [transferConfirmed, setTransferConfirmed] = useState(false); const [amountReceived, setAmountReceived] = useState(''); const [customerName, setCustomerName] = useState('');
  const [openingAmount, setOpeningAmount] = useState('0'); const [businessName, setBusinessName] = useState('Mi negocio'); const [registerName, setRegisterName] = useState('Caja 1'); const [closingAmount, setClosingAmount] = useState('');
  const [showClose, setShowClose] = useState(false); const [showMovement, setShowMovement] = useState(false); const [movementType, setMovementType] = useState('in'); const [movementAmount, setMovementAmount] = useState(''); const [movementNote, setMovementNote] = useState(''); const [movementError, setMovementError] = useState(''); const [closedSession, setClosedSession] = useState(null); const [lastSale, setLastSale] = useState(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const checkoutId = useRef(null); const checkoutSignature = useRef(null); const checkoutInFlight = useRef(false); const movementId = useRef(null); const barcodeRef = useRef(null);

  async function load() {
    const [p, s] = await Promise.all([fetch('/api/products').then(r => r.json()), fetch('/api/cash-sessions').then(r => r.json())]);
    if (p.error || s.error) throw new Error(p.error || s.error);
    setProducts(p.products); setSession(s.session); setBusinessName(s.businessName || s.session?.businessName || 'Mi negocio'); if (!s.session) setClosedSession(s.lastClosed || null);
  }
  useEffect(() => {
    load()
      .catch(error => setError(error.message))
      .finally(() => setLoading(false));

    if (!cashier) {
      fetch('/api/registers')
        .then(response => response.json())
        .then(data => {
          if (data.registers?.length) {
            setSavedRegisters(data.registers);
            setRegisterName(data.registers[0].name);
          }
        })
        .catch(() => {});
    }
  }, []);
  useEffect(() => { setMounted(true); }, []);
  const categories = useMemo(() => ['Todos', ...new Set(products.map(product => product.category))], [products]);
  const visible = useMemo(() => products.filter(product => (category === 'Todos' || product.category === category) && (`${product.name} ${product.barcode || ''} ${product.code}`).toLowerCase().includes(query.toLowerCase())), [products, category, query]);
  const lines = useMemo(() => ticket.map(item => ({ ...item, product: products.find(product => product.id === item.productId) })).filter(item => item.product), [ticket, products]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const priced = priceTicket(lines, saleAdjustment);
  const total = priced.total;
  const payments = splitPayment ? paymentRows.filter(row => Number(row.amount) > 0).map(row => ({ method: row.method, amount: roundMoney(Number(row.amount)), reference: row.reference || '' })) : [{ method: paymentMethod, amount: total, reference: paymentMethod === 'cash' ? '' : paymentReference }];
  const paymentsTotal = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const cashPortion = roundMoney(payments.filter(payment => payment.method === 'cash').reduce((sum, payment) => sum + payment.amount, 0));
  const change = cashPortion ? Math.max(0, roundMoney(Number(amountReceived || 0) - cashPortion)) : 0;
  const hasTransfer = payments.some(payment => payment.method === 'transfer');
  const paymentReady = total > 0 && paymentsTotal === total && payments.length > 0 && (!splitPayment || payments.length > 1) && (!cashPortion || (amountReceived !== '' && Number(amountReceived) >= cashPortion)) && (!hasTransfer || transferConfirmed);

  function add(product) {
    if (checkoutInFlight.current) return;
    if (!session) { setError('Abrí la caja antes de agregar productos.'); return; }
    if (product.stock < 1) { setError('Este producto no tiene stock.'); return; }
    setError(''); setLastSale(null); checkoutId.current = null;
    setTicket(current => {
      const existing = current.find(line => line.productId === product.id);
      if (existing) return current.map(line => line.productId === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) } : line);
      return [...current, { productId: product.id, quantity: 1 }];
    });
    setQuery(''); barcodeRef.current?.focus();
  }
  function quantity(id, value) { if (checkoutInFlight.current) return; checkoutId.current = null; setTicket(current => current.map(line => line.productId === id ? { ...line, quantity: Math.max(1, Math.min(value, products.find(p => p.id === id)?.stock || 1)) } : line)); }
  function remove(id) { if (checkoutInFlight.current) return; checkoutId.current = null; setTicket(current => current.filter(line => line.productId !== id)); }
  function safeAdjustment(adjustment) { return { type: adjustment.type, percent: adjustment.type === 'none' || adjustment.percent === '' ? 0 : Math.min(100, Math.max(0, roundMoney(Number(adjustment.percent) || 0))) }; }
  function setLineAdjustment(id, adjustment) { if (checkoutInFlight.current) return; checkoutId.current = null; setTicket(current => current.map(line => line.productId === id ? { ...line, adjustment: safeAdjustment(adjustment) } : line)); }
  function changeSaleAdjustment(adjustment) { if (checkoutInFlight.current) return; checkoutId.current = null; setSaleAdjustment(safeAdjustment(adjustment)); }
  function clearTicket() { if (checkoutInFlight.current) return; checkoutId.current = null; setTicket([]); setSaleAdjustment({ type: 'none', percent: 0 }); }
  function scan(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault(); const exact = products.find(product => (product.barcode || product.code).toLowerCase() === query.trim().toLowerCase());
    if (exact) add(exact); else if (visible.length === 1) add(visible[0]); else setError('No encontramos ese código. Buscá por nombre o elegí un producto.');
  }
  async function openCash(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/cash-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingAmount: Number(openingAmount), businessName, registerName }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error); setSession(data.session); setClosedSession(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function closeCash(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (ticket.length) throw new Error('Terminá o limpiá el ticket antes de cerrar la caja.');
      const response = await fetch('/api/cash-sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closingAmount: Number(closingAmount) }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error); setClosedSession(data.session); setSession(null); setShowClose(false); setClosingAmount('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function checkout() {
    if (checkoutInFlight.current || !lines.length || !session) return;
    checkoutInFlight.current = true; setError(''); setBusy(true);
    try {
      if (!paymentReady) throw new Error('Revisá que los medios de pago sumen el total y el efectivo recibido sea suficiente.');
      let sale;
      {
        const payload = { items: ticket, adjustment: saleAdjustment, payments, amountReceived: cashPortion ? Number(amountReceived) : 0, transferConfirmed: hasTransfer && transferConfirmed, customerName };
        const signature = JSON.stringify(payload);
        if (!checkoutId.current || checkoutSignature.current !== signature) { checkoutId.current = crypto.randomUUID(); checkoutSignature.current = signature; }
        const response = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checkoutId: checkoutId.current, ...payload }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo registrar la venta. Intentá nuevamente.');
        if (!data.sale?.id) throw new Error('No recibimos la confirmación de la venta. Reintentá sin cambiar el ticket.');
        sale = data.sale;
      }
      setLastSale(sale); setTicket([]); setSaleAdjustment({ type: 'none', percent: 0 }); setAmountReceived(''); setCustomerName(''); setSplitPayment(false); setPaymentRows([{ method: 'cash', amount: '', reference: '' }, { method: 'card', amount: '', reference: '' }]); setPaymentReference(''); setTransferConfirmed(false); checkoutId.current = null; checkoutSignature.current = null;
      window.dispatchEvent(new Event('caja:sale-created')); void load().catch(() => setError('La venta se guardó, pero no pudimos actualizar la caja. Recargá la página para ver el stock actual.'));
    } catch (e) { setError(e.message || 'No se pudo registrar la venta. Conservamos tu ticket para reintentar.'); } finally { checkoutInFlight.current = false; setBusy(false); }
  }

  async function saveMovement(event) {
    event.preventDefault(); setMovementError(''); setBusy(true);
    try {
      const amount = roundMoney(Number(movementAmount));
      if (!Number.isFinite(amount) || amount <= 0 || movementNote.trim().length < 3) throw new Error('Ingresá un importe y un motivo válidos.');
      const signed = movementType === 'in' ? amount : -amount;
      if (session.openingAmount + session.cashSalesTotal + (session.cashAdjustmentsTotal || 0) + signed < 0) throw new Error('El retiro supera el efectivo esperado en caja.');
      {
        movementId.current ||= crypto.randomUUID();
        const response = await fetch('/api/cash-movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movementId: movementId.current, type: movementType, amount, note: movementNote }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        if (data.session) setSession(data.session); else await load();
      }
      movementId.current = null; setMovementAmount(''); setMovementNote(''); setShowMovement(false);
    } catch (error) { setMovementError(error.message); } finally { setBusy(false); }
  }

  const paymentProps = { splitPayment, setSplitPayment, paymentMethod, setPaymentMethod, paymentRows, setPaymentRows, paymentReference, setPaymentReference, transferConfirmed, setTransferConfirmed, amountReceived, setAmountReceived, customerName, setCustomerName, total, paymentsTotal, cashPortion, change, paymentReady, checkout, busy, hasItems: lines.length > 0 };

  return <div className="pos-page"><div className="pos-shell">
    <div className="pos-topline"><div><span className="eyebrow">PUNTO DE VENTA</span><h1>Todo listo para <em>cobrar.</em></h1><p>Productos, ticket y pago. Todo en su lugar.</p></div><div className="pos-top-actions"><span className="date-chip"><Clock3 size={15}/>{mounted ? new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha de hoy'}</span>{!cashier && <Link href={insidePanel ? '/panel/ventas' : '/ventas'} className="quiet-link">Ver ventas <ArrowRight size={16}/></Link>}</div></div>
    {error && <div className="alert-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Cerrar error"><X size={16}/></button></div>}
    {loading ? <div className="pos-loading">Cargando tu caja...</div> : !session ? <>{!cashier && closedSession && <div className="closed-summary"><Check size={20}/><div><strong>{closedSession.registerName} cerrada</strong><span>{closedSession.salesCount} ventas · Esperado {money(closedSession.expectedClosingAmount)} · Contado {money(closedSession.closingAmount)} · Diferencia {money(closedSession.difference)}</span></div></div>}{cashier ? <div className="data-empty">La caja está cerrada. Pedile al jefe de negocio que la abra para comenzar a cobrar.</div> : <div className="open-cash-layout"><div className="open-cash-art"><span className="eyebrow">JORNADA DE VENTAS</span><Wallet size={60}/><h2>Una caja abierta.<br/>Un día en orden.</h2><p>Registrá el efectivo inicial para empezar. Después vas a poder cobrar, seguir las ventas y hacer el cierre.</p></div><form className="open-cash-form" onSubmit={openCash}><span className="eyebrow">APERTURA</span><h2>Abrir caja</h2><label>Nombre del negocio<input value={businessName} onChange={e => setBusinessName(e.target.value)} required maxLength={60}/></label><label>Nombre de la caja<input list="saved-registers" value={registerName} onChange={e => setRegisterName(e.target.value)} required maxLength={30}/><datalist id="saved-registers">{savedRegisters.map(register => <option key={register.id} value={register.name}/>)}</datalist></label><label>Fondo inicial en efectivo<input type="number" min="0" step="0.01" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} required/></label><button className="button-primary" disabled={busy}>{busy ? 'Abriendo...' : 'Abrir caja'} <ArrowRight size={18}/></button></form></div>}</> : <>
      <div className="register-strip"><div><span className="live-dot"/><strong>{session.businessName} · {session.registerName}</strong><span className="register-status">Abierta desde {mounted ? new Date(session.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>{!cashier && <div className="register-metrics"><span>Ventas de la jornada <strong>{session.salesCount}</strong></span><span>Total cobrado <strong>{money(session.grossTotal)}</strong></span><button type="button" onClick={() => { setMovementError(''); setShowMovement(true); }}>Movimiento de efectivo <Plus size={15}/></button><button type="button" onClick={() => setShowClose(true)}>Cerrar caja <ChevronDown size={15}/></button></div>}</div>
      <div className="pos-grid" inert={busy ? true : undefined} aria-busy={busy}><section className="products-panel" aria-label="Productos"><div className="panel-heading"><div><span className="eyebrow">01 / PRODUCTOS</span><h2>Encontrá y agregá</h2></div><span className="panel-count">{products.length} productos</span></div><div className="scan-field"><Barcode size={20}/><input ref={barcodeRef} autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={scan} placeholder="Escaneá un código o buscá un producto" aria-label="Buscar producto por código o nombre"/><span>ENTER ↵</span></div><div className="filter-row" aria-label="Filtrar categorías">{categories.map(item => <button type="button" key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="product-list-head"><span>PRODUCTO / CÓDIGO</span><span>STOCK</span><span>PRECIO</span><span/></div><div className="product-list">{visible.map(product => <button className="product-row" key={product.id} type="button" onClick={() => add(product)} disabled={product.stock <= 0 || product.isActive === false}><span className="product-identity"><ProductThumb product={product}/><span><strong>{product.name}</strong><small>{product.barcode || product.code} · {product.category}{product.stock === 0 ? ' · Agotado' : ''}</small></span></span><span className={product.stock <= (product.minStock ?? 5) ? 'stock-low' : ''}>{product.stock}</span><strong>{money(product.price)}</strong><span className="add-product"><Plus size={17}/></span></button>)}{!visible.length && <div className="empty-list"><Search size={24}/><strong>{products.length ? 'Sin resultados' : 'Tu inventario está vacío'}</strong><span>{products.length ? 'Probá otro nombre o código.' : 'Agregá tu primer producto para comenzar a vender.'}</span></div>}</div><div className="products-foot"><span><Barcode size={16}/> Compatible con lector de códigos de barras</span></div></section>
      <TicketPanel session={session} customerName={customerName} lines={lines} itemCount={itemCount} priced={priced} quantity={quantity} remove={remove} clear={clearTicket} setLineAdjustment={setLineAdjustment} saleAdjustment={saleAdjustment} setSaleAdjustment={changeSaleAdjustment} paymentProps={paymentProps} allowAdjustments={!cashier}/></div></>}
    {!cashier && showMovement && session && <CashMovementModal session={session} type={movementType} setType={setMovementType} amount={movementAmount} setAmount={setMovementAmount} note={movementNote} setNote={setMovementNote} busy={busy} error={movementError} close={() => setShowMovement(false)} submit={saveMovement}/>}
    {!cashier && showClose && session && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowClose(false); }}><div className="modal" role="dialog" aria-modal="true" aria-label="Cerrar caja"><div className="modal-head"><div><span className="eyebrow">FIN DE JORNADA</span><h2>Cerrar {session.registerName}</h2></div><button type="button" onClick={() => setShowClose(false)} aria-label="Cerrar"><X size={20}/></button></div><p>Contá el efectivo de la caja e ingresá el monto real. El sistema comparará el cierre con el fondo inicial, los cobros y los movimientos de efectivo.</p><div className="close-summary"><span>Fondo inicial <strong>{money(session.openingAmount)}</strong></span><span>Cobros en efectivo <strong>{money(session.cashSalesTotal)}</strong></span><span>Ingresos y retiros <strong>{money(session.cashAdjustmentsTotal || 0)}</strong></span><span>Efectivo esperado <strong>{money(session.openingAmount + session.cashSalesTotal + (session.cashAdjustmentsTotal || 0))}</strong></span></div><form onSubmit={closeCash}><label>Efectivo contado<input type="number" min="0" step="0.01" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} required/></label><button className="button-primary" disabled={busy}>{busy ? 'Cerrando...' : 'Confirmar cierre'} <Check size={17}/></button></form></div></div>}
    {lastSale && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setLastSale(null); }}><div className="modal receipt-modal" role="dialog" aria-modal="true" aria-label="Cobro registrado"><div className="modal-head"><div><span className="eyebrow">COBRO REGISTRADO</span><h2>Venta realizada con éxito <Check size={23}/></h2></div><button type="button" onClick={() => setLastSale(null)} aria-label="Cerrar"><X size={20}/></button></div><div className="receipt-paper"><div className="receipt-brand">{lastSale.businessName || 'caja'}<span>.</span></div><div className="receipt-title">COMPROBANTE NO FISCAL · {receiptCode(lastSale.receiptNumber)}</div><div className="receipt-date">{lastSale.registerName} · {new Date(lastSale.createdAt).toLocaleString('es-AR')}</div><div className="receipt-items">{lastSale.items.map(item => <div key={item.productId}><span>{item.quantity} × {item.name}</span><strong>{money(item.lineTotal)}</strong></div>)}</div>{lastSale.saleAdjustmentAmount !== 0 && <div className="receipt-items"><div><span>{lastSale.adjustment?.type === 'discount' ? 'Descuento' : 'Recargo'} de venta ({lastSale.adjustment?.percent}%)</span><strong>{money(lastSale.saleAdjustmentAmount)}</strong></div></div>}<div className="receipt-sum"><span>TOTAL</span><strong>{money(lastSale.total)}</strong></div><div className="receipt-items">{(lastSale.payments || [{ method: lastSale.paymentMethod, amount: lastSale.total }]).map((payment, index) => <div key={index}><span>{PAYMENT_METHODS[payment.method]}{payment.reference && <small> · Ref. {payment.reference}</small>}</span><strong>{money(payment.amount)}</strong></div>)}{lastSale.payments?.some(payment => payment.method === 'cash') && <div><span>Efectivo recibido</span><strong>{money(lastSale.amountReceived)}</strong></div>}{lastSale.change > 0 && <div><span>Vuelto</span><strong>{money(lastSale.change)}</strong></div>}</div></div><div className="receipt-actions"><button type="button" onClick={() => window.print()}><Printer size={17}/> Imprimir</button><>{!cashier && <Link className="button-primary" href={insidePanel ? `/panel/ventas/${lastSale.id}` : `/ventas/${lastSale.id}`}>Ver comprobante <ArrowRight size={17}/></Link>}<button type="button" onClick={() => setLastSale(null)}>Cerrar</button></></div></div></div>}
  </div></div>;
}
