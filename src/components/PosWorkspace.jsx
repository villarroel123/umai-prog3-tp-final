'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Printer, Search, Wallet, X } from 'lucide-react';
import { money, PAYMENT_METHODS, receiptCode, roundMoney } from '@/lib/models';
import { ADJUSTMENT_LABELS, priceTicket } from '@/lib/billing';
import PaymentArea from './PaymentArea';
import CashMovementModal from './CashMovementModal';
import useAtajos from '@/hooks/useAtajos';
import { AdjustmentModal, ConfirmAccountReturnModal, ReturnProductModal } from './PosActionModals';

export default function PosWorkspace({ insidePanel = false, cashier = false, cashierName = 'Cajero' }) {
  const [products, setProducts] = useState([]);
  const [savedRegisters, setSavedRegisters] = useState([]);
  const [session, setSession] = useState(null);
  const [ticket, setTicket] = useState([]);
  const [saleAdjustment, setSaleAdjustment] = useState({ type: 'none', percent: 0 });
  const [query, setQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); const [splitPayment, setSplitPayment] = useState(false); const [paymentRows, setPaymentRows] = useState([{ method: 'cash', amount: '', reference: '' }, { method: 'card', amount: '', reference: '' }]); const [paymentReference, setPaymentReference] = useState(''); const [transferConfirmed, setTransferConfirmed] = useState(false); const [amountReceived, setAmountReceived] = useState(''); const [customerName, setCustomerName] = useState('');
  const [openingAmount, setOpeningAmount] = useState('0'); const [businessName, setBusinessName] = useState('Mi negocio'); const [registerName, setRegisterName] = useState('Caja 1'); const [closingAmount, setClosingAmount] = useState('');
  const [showClose, setShowClose] = useState(false); const [showMovement, setShowMovement] = useState(false); const [movementType, setMovementType] = useState('in'); const [movementAmount, setMovementAmount] = useState(''); const [movementNote, setMovementNote] = useState(''); const [movementError, setMovementError] = useState(''); const [closedSession, setClosedSession] = useState(null); const [lastSale, setLastSale] = useState(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(null);
  const [mode, setMode] = useState('productos');
  const [printError, setPrintError] = useState(''); const [printBusy, setPrintBusy] = useState(false); const [zPrintError, setZPrintError] = useState('');
  const [actionModal, setActionModal] = useState(null); const [returnValue, setReturnValue] = useState(''); const [returnError, setReturnError] = useState(''); const [selectedLineId, setSelectedLineId] = useState(null);
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
  useEffect(() => {
    setMounted(true);
    const updateClock = () => setNow(new Date());
    updateClock();
    const timer = setInterval(updateClock, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!session) return;
    if (mode === 'productos') focusBarcode();
    else if (paymentMethod === 'cash') document.querySelector('.demo-payment .cash-fields input')?.focus();
    else document.querySelector(`[data-payment-method="${paymentMethod}"]`)?.focus();
  }, [mode, session, paymentMethod]);
  const visible = useMemo(() => products.filter(product => (`${product.name} ${product.barcode || ''} ${product.code}`).toLowerCase().includes(query.toLowerCase())), [products, query]);
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
    setSelectedLineId(product.id);
    setQuery(''); barcodeRef.current?.focus();
  }
  function quantity(id, value) { if (checkoutInFlight.current) return; checkoutId.current = null; setTicket(current => current.map(line => line.productId === id ? { ...line, quantity: Math.max(1, Math.min(value, products.find(p => p.id === id)?.stock || 1)) } : line)); }
  function remove(id) { if (checkoutInFlight.current) return; checkoutId.current = null; setTicket(current => current.filter(line => line.productId !== id)); }
  function safeAdjustment(adjustment) { return adjustment.mode === 'fixed' ? { type: adjustment.type, mode: 'fixed', amount: roundMoney(Number(adjustment.amount) || 0), percent: 0 } : { type: adjustment.type, percent: adjustment.type === 'none' || adjustment.percent === '' ? 0 : Math.min(100, Math.max(0, roundMoney(Number(adjustment.percent) || 0))) }; }
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
      try {
        const printResponse = await fetch('/api/print/z', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: data.session.id }) });
        const printData = await printResponse.json();
        setZPrintError(printResponse.ok ? '' : printData.error || 'El cierre quedó guardado, pero no se pudo imprimir.');
      } catch { setZPrintError('El cierre quedó guardado, pero no se pudo contactar a la impresora.'); }
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
      setLastSale(sale); setMode('productos'); setActionModal(null); setPrintError(''); setTicket([]); setSaleAdjustment({ type: 'none', percent: 0 }); setAmountReceived(''); setCustomerName(''); setSplitPayment(false); setPaymentRows([{ method: 'cash', amount: '', reference: '' }, { method: 'card', amount: '', reference: '' }]); setPaymentReference(''); setTransferConfirmed(false); checkoutId.current = null; checkoutSignature.current = null;
      await reprintSale(sale);
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

  function focusBarcode() { barcodeRef.current?.focus(); }
  function closeActionModal() { setActionModal(null); setReturnError(''); setTimeout(focusBarcode, 0); }
  function goToProducts() { setMode('productos'); setActionModal(null); setShowClose(false); setShowMovement(false); setLastSale(null); setReturnError(''); setTimeout(focusBarcode, 0); }
  function closeAnyModal() { goToProducts(); }
  function openProductReturn() { setReturnValue(''); setReturnError(''); setActionModal('product-return'); }
  function openAccountReturn() { if (lines.length) setActionModal('account-return'); }
  function openAdjustments() { setActionModal('adjustments'); }
  function openCheckout() { if (lines.length && total > 0) setMode('cobro'); }
  function deleteSelectedLine() {
    const target = lines.find(line => line.productId === selectedLineId) || lines.at(-1);
    if (!target) return;
    remove(target.productId);
    setSelectedLineId(null);
    focusBarcode();
  }
  function applyProductReturn(event) {
    event.preventDefault();
    const match = returnValue.trim().match(/^(?:(\d+)\s*[x*]\s*)?(.+)$/i);
    if (!match) { setReturnError('IngresÃ¡ un cÃ³digo de producto vÃ¡lido.'); return; }
    const code = match[2].trim().toLowerCase();
    const line = lines.find(item => [item.product.barcode, item.product.code].some(value => String(value || '').toLowerCase() === code));
    if (!line) { setReturnError('Ese producto no estÃ¡ en la cuenta.'); return; }
    const count = match[1] ? Number(match[1]) : line.quantity;
    if (!Number.isSafeInteger(count) || count < 1 || count > line.quantity) { setReturnError(`La cuenta tiene ${line.quantity} unidad(es) de ese producto.`); return; }
    if (count === line.quantity) remove(line.productId);
    else quantity(line.productId, line.quantity - count);
    setSelectedLineId(null);
    closeActionModal();
  }
  function returnWholeAccount() {
    clearTicket();
    setSelectedLineId(null);
    closeActionModal();
  }
  function applyAdjustment({ scope, productId, adjustment }) {
    const value = safeAdjustment(adjustment);
    if (scope === 'product' && productId) setLineAdjustment(productId, value);
    else changeSaleAdjustment(value);
    closeActionModal();
  }
  const modalOpen = Boolean(actionModal || showClose || showMovement || lastSale);
  const hotkeys = {
    F1: modalOpen || mode !== 'productos' ? () => {} : deleteSelectedLine,
    F2: modalOpen || mode !== 'productos' ? () => {} : openProductReturn,
    F3: modalOpen || mode !== 'productos' ? () => {} : openAccountReturn,
    F4: modalOpen || cashier || mode !== 'productos' ? () => {} : openAdjustments,
    F9: closeAnyModal,
    F10: modalOpen ? () => {} : mode === 'productos' ? openCheckout : checkout,
    Escape: closeAnyModal,
    ...(mode === 'cobro' && !modalOpen ? { Enter: event => { if (event.target.closest?.('.demo-payment') && paymentReady) checkout(); } } : {}),
    ...(actionModal === 'product-return' ? { Enter: () => document.querySelector('.pos-action-modal form')?.requestSubmit() } : {}),
    ...(actionModal === 'account-return' ? { Enter: returnWholeAccount } : {}),
    ArrowDown: modalOpen || mode !== 'productos' ? () => {} : () => {
      if (!lines.length) return;
      const index = lines.findIndex(line => line.productId === selectedLineId);
      setSelectedLineId(lines[Math.min(lines.length - 1, index + 1)].productId);
    },
    ArrowUp: modalOpen || mode !== 'productos' ? () => {} : () => {
      if (!lines.length) return;
      const index = lines.findIndex(line => line.productId === selectedLineId);
      setSelectedLineId(lines[Math.max(0, index < 0 ? lines.length - 1 : index - 1)].productId);
    },
  };
  useAtajos(hotkeys, Boolean(session));

  async function reprintSale(sale) {
    setPrintBusy(true);
    try {
      const response = await fetch('/api/print/sale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saleId: sale.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo imprimir el ticket.');
      setPrintError('');
    } catch (cause) { setPrintError(cause.message || 'No se pudo contactar a la impresora.'); }
    finally { setPrintBusy(false); }
  }

  async function reprintZ(sessionToPrint) {
    try {
      const response = await fetch('/api/print/z', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sessionToPrint.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo imprimir el cierre Z.');
      setZPrintError('');
    } catch (cause) { setZPrintError(cause.message || 'No se pudo contactar a la impresora.'); }
  }

  const paymentProps = { splitPayment, setSplitPayment, paymentMethod, setPaymentMethod, paymentRows, setPaymentRows, paymentReference, setPaymentReference, transferConfirmed, setTransferConfirmed, amountReceived, setAmountReceived, customerName, setCustomerName, total, paymentsTotal, cashPortion, change, paymentReady, checkout, busy, hasItems: lines.length > 0 };

  return <div className={`pos-page pos-demo-screen${session ? ' pos-demo-active' : ' pos-demo-closed'}`}><div className="pos-shell pos-demo-shell">
    <div className="pos-topline"><div><h1>{session?.businessName || businessName}</h1><div className="demo-shortcuts" aria-label="Atajos de teclado">
      <button type="button" className="demo-shortcut" onClick={deleteSelectedLine} disabled={!lines.length || mode !== 'productos'}><span className="demo-shortcut-key">F1</span><span className="demo-shortcut-label">Eliminar<br/>producto</span></button>
      <button type="button" className="demo-shortcut" onClick={openProductReturn} disabled={!lines.length || mode !== 'productos'}><span className="demo-shortcut-key">F2</span><span className="demo-shortcut-label">Devolución<br/>de producto</span></button>
      <button type="button" className="demo-shortcut" onClick={openAccountReturn} disabled={!lines.length || mode !== 'productos'}><span className="demo-shortcut-key">F3</span><span className="demo-shortcut-label">Devolución total<br/>de cuenta</span></button>
      <button type="button" className="demo-shortcut" onClick={openAdjustments} disabled={cashier || mode !== 'productos'}><span className="demo-shortcut-key">F4</span><span className="demo-shortcut-label">Ofertas<br/>y recargos</span></button>
      <button type="button" className="demo-shortcut" onClick={goToProducts} disabled={mode === 'productos'}><span className="demo-shortcut-key">F9</span><span className="demo-shortcut-label">Volver a<br/>productos</span></button>
      <button type="button" className="demo-shortcut" onClick={openCheckout} disabled={!lines.length || total <= 0 || mode === 'cobro'}><span className="demo-shortcut-key">F10</span><span className="demo-shortcut-label">Ir a<br/>cobro</span></button>
    </div></div><div className="pos-top-actions"><span className="demo-chip">Cajero: <strong>{cashierName}</strong></span><span className="demo-chip demo-date">{mounted ? now?.toLocaleDateString('es-AR') : '—'}</span><span className="demo-chip"><strong>{mounted ? now?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong></span>{!cashier && <Link href={insidePanel ? '/panel/ventas' : '/ventas'} className="quiet-link">Ventas <ArrowRight size={16}/></Link>}</div></div>
    {error && <div className="alert-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Cerrar error"><X size={16}/></button></div>}
    {closedSession && zPrintError && <div className="alert-error" role="alert">{zPrintError}<button type="button" onClick={() => reprintZ(closedSession)}>Reimprimir cierre Z</button></div>}
    {loading ? <div className="pos-loading">Cargando tu caja...</div> : !session ? <>{!cashier && closedSession && <div className="closed-summary"><Check size={20}/><div><strong>{closedSession.registerName} cerrada</strong><span>{closedSession.salesCount} ventas · Esperado {money(closedSession.expectedClosingAmount)} · Contado {money(closedSession.closingAmount)} · Diferencia {money(closedSession.difference)}</span></div></div>}{cashier ? <div className="data-empty">La caja está cerrada. Pedile al jefe de negocio que la abra para comenzar a cobrar.</div> : <div className="open-cash-layout"><div className="open-cash-art"><span className="eyebrow">JORNADA DE VENTAS</span><Wallet size={60}/><h2>Una caja abierta.<br/>Un día en orden.</h2><p>Registrá el efectivo inicial para empezar. Después vas a poder cobrar, seguir las ventas y hacer el cierre.</p></div><form className="open-cash-form" onSubmit={openCash}><span className="eyebrow">APERTURA</span><h2>Abrir caja</h2><label>Nombre del negocio<input value={businessName} onChange={e => setBusinessName(e.target.value)} required maxLength={60}/></label><label>Nombre de la caja<input list="saved-registers" value={registerName} onChange={e => setRegisterName(e.target.value)} required maxLength={30}/><datalist id="saved-registers">{savedRegisters.map(register => <option key={register.id} value={register.name}/>)}</datalist></label><label>Fondo inicial en efectivo<input type="number" min="0" step="0.01" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} required/></label><button className="button-primary" disabled={busy}>{busy ? 'Abriendo...' : 'Abrir caja'} <ArrowRight size={18}/></button></form></div>}</> : <>
      <div className="pos-grid" inert={busy ? true : undefined} aria-busy={busy}>
        <section className={`demo-grid ${mode === 'cobro' ? 'is-disabled' : 'is-active'}`} inert={mode === 'cobro' ? true : undefined} aria-label="Productos">
          <form className="demo-search" onSubmit={event => { event.preventDefault(); scan({ key: 'Enter', preventDefault: () => {} }); }}>
            <Search size={20}/><input ref={barcodeRef} autoFocus value={query} onChange={event => setQuery(event.target.value)} onKeyDown={scan} disabled={mode === 'cobro'} placeholder="Buscar por código o descripción" aria-label="Buscar producto por código o nombre" autoComplete="off"/>
          </form>
          <div className="demo-table-wrap"><div className="demo-table-head"><span>Código</span><span>Descripción</span><span>Cantidad</span><span>Precio unitario</span><span>Importe</span></div>
            <div className="demo-table-body">{visible.map(product => {
              const line = lines.find(item => item.productId === product.id);
              const pricedLine = priced.items.find(item => item.productId === product.id);
              return <button type="button" key={product.id} className={`demo-table-row${selectedLineId === product.id ? ' is-selected' : ''}${line ? ' in-cart' : ''}`} data-product-id={product.id} onClick={() => add(product)} disabled={product.stock <= 0 || product.isActive === false}>
                <span>{product.barcode || product.code}</span><strong>{product.name}</strong><span><b className="demo-qty">{line?.quantity || 0}</b></span><span>{money(product.price)}</span><strong>{money(pricedLine?.lineTotal || 0)}</strong>
              </button>;
            })}{!visible.length && <div className="empty-list"><Search size={24}/><strong>{products.length ? 'Sin resultados' : 'Tu inventario está vacío'}</strong><span>{products.length ? 'Probá otro nombre o código.' : 'Agregá tu primer producto para comenzar a vender.'}</span></div>}</div>
          </div>
        </section>
        <aside className="demo-summary">
          <div className="demo-total"><span className="demo-total-label">Total a cobrar</span><strong className="demo-total-amount">{money(total)}</strong><span className="demo-total-meta">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</span></div>
          <div className={`demo-payment ${mode === 'productos' ? 'is-disabled' : 'is-active'}`} inert={mode === 'productos' ? true : undefined}>
            <h2>Información de pago</h2>
            <div className="demo-lines"><div><span>Subtotal</span><strong>{money(priced.subtotal)}</strong></div><div><span>{saleAdjustment.type === 'none' ? 'Descuento (0%)' : `${ADJUSTMENT_LABELS[saleAdjustment.type]} (${saleAdjustment.mode === 'fixed' ? money(saleAdjustment.amount) : `${saleAdjustment.percent}%`})`}</span><strong>{priced.saleAdjustmentAmount ? money(priced.saleAdjustmentAmount) : '—'}</strong></div></div>
            <PaymentArea {...paymentProps}/>
          </div>
        </aside>
      </div>
    </>}
    {session && actionModal === 'product-return' && <ReturnProductModal value={returnValue} setValue={setReturnValue} error={returnError} close={closeActionModal} submit={applyProductReturn}/>}
    {session && actionModal === 'account-return' && <ConfirmAccountReturnModal close={closeActionModal} confirm={returnWholeAccount}/>}
    {session && actionModal === 'adjustments' && <AdjustmentModal selectedLine={lines.find(line => line.productId === selectedLineId)} close={closeActionModal} apply={applyAdjustment}/>}
    {!cashier && showMovement && session && <CashMovementModal session={session} type={movementType} setType={setMovementType} amount={movementAmount} setAmount={setMovementAmount} note={movementNote} setNote={setMovementNote} busy={busy} error={movementError} close={() => setShowMovement(false)} submit={saveMovement}/>}
    {!cashier && showClose && session && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowClose(false); }}><div className="modal" role="dialog" aria-modal="true" aria-label="Cerrar caja"><div className="modal-head"><div><span className="eyebrow">FIN DE JORNADA</span><h2>Cerrar {session.registerName}</h2></div><button type="button" onClick={() => setShowClose(false)} aria-label="Cerrar"><X size={20}/></button></div><p>Contá el efectivo de la caja e ingresá el monto real. El sistema comparará el cierre con el fondo inicial, los cobros y los movimientos de efectivo.</p><div className="close-summary"><span>Fondo inicial <strong>{money(session.openingAmount)}</strong></span><span>Cobros en efectivo <strong>{money(session.cashSalesTotal)}</strong></span><span>Ingresos y retiros <strong>{money(session.cashAdjustmentsTotal || 0)}</strong></span><span>Efectivo esperado <strong>{money(session.openingAmount + session.cashSalesTotal + (session.cashAdjustmentsTotal || 0))}</strong></span></div><form onSubmit={closeCash}><label>Efectivo contado<input type="number" min="0" step="0.01" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} required/></label><button className="button-primary" disabled={busy}>{busy ? 'Cerrando...' : 'Confirmar cierre'} <Check size={17}/></button></form></div></div>}
    {lastSale && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setLastSale(null); }}><div className="modal receipt-modal" role="dialog" aria-modal="true" aria-label="Cobro registrado"><div className="modal-head"><div><span className="eyebrow">COBRO REGISTRADO</span><h2>Venta realizada con éxito <Check size={23}/></h2></div><button type="button" onClick={() => setLastSale(null)} aria-label="Cerrar"><X size={20}/></button></div><div className="receipt-paper"><div className="receipt-brand">{lastSale.businessName || 'ZETA'}<span>.</span></div><div className="receipt-title">COMPROBANTE NO FISCAL · {receiptCode(lastSale.receiptNumber)}</div><div className="receipt-date">{lastSale.registerName} · {new Date(lastSale.createdAt).toLocaleString('es-AR')}</div><div className="receipt-items">{lastSale.items.map(item => <div key={item.productId}><span>{item.quantity} × {item.name}</span><strong>{money(item.lineTotal)}</strong></div>)}</div>{lastSale.saleAdjustmentAmount !== 0 && <div className="receipt-items"><div><span>{lastSale.adjustment?.type === 'discount' ? 'Descuento' : 'Recargo'} de venta ({lastSale.adjustment?.percent}%)</span><strong>{money(lastSale.saleAdjustmentAmount)}</strong></div></div>}<div className="receipt-sum"><span>TOTAL</span><strong>{money(lastSale.total)}</strong></div><div className="receipt-items">{(lastSale.payments || [{ method: lastSale.paymentMethod, amount: lastSale.total }]).map((payment, index) => <div key={index}><span>{PAYMENT_METHODS[payment.method]}{payment.reference && <small> · Ref. {payment.reference}</small>}</span><strong>{money(payment.amount)}</strong></div>)}{lastSale.payments?.some(payment => payment.method === 'cash') && <div><span>Efectivo recibido</span><strong>{money(lastSale.amountReceived)}</strong></div>}{lastSale.change > 0 && <div><span>Vuelto</span><strong>{money(lastSale.change)}</strong></div>}</div></div>{printError && <p className="alert-error" role="alert">{printError}</p>}<div className="receipt-actions"><button type="button" disabled={printBusy} onClick={() => reprintSale(lastSale)}><Printer size={17}/>{printBusy ? "Imprimiendo..." : "Reimprimir ticket"}</button><button type="button" onClick={() => window.print()}><Printer size={17}/> Imprimir</button><>{!cashier && <Link className="button-primary" href={insidePanel ? `/panel/ventas/${lastSale.id}` : `/ventas/${lastSale.id}`}>Ver comprobante <ArrowRight size={17}/></Link>}<button type="button" onClick={() => setLastSale(null)}>Cerrar</button></></div></div></div>}
  </div></div>;
}
