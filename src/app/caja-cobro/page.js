'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { nextScannedQuantity, parseQuantityCommand } from '@/lib/scan-quantity';


const PRODUCTS = [
  { id: 1, barcode: '7791001000012', name: 'Café en grano', category: 'Almacén', price: 8500, stock: 12 },
  { id: 2, barcode: '7791001000029', name: 'Taza de cerámica', category: 'Accesorios', price: 6200, stock: 8 },
  { id: 3, barcode: '7791001000036', name: 'Yerba orgánica', category: 'Almacén', price: 4300, stock: 15 },
  { id: 4, barcode: '7791001000043', name: 'Botella térmica', category: 'Accesorios', price: 12500, stock: 5 },
  { id: 5, barcode: '7791001000050', name: 'Chocolate artesanal', category: 'Almacén', price: 3900, stock: 9 },
  { id: 6, barcode: '7791001000067', name: 'Cuaderno', category: 'Papelería', price: 5400, stock: 7 },
];
const METHODS = ['Efectivo', 'Tarjeta', 'Transferencia'];
const money = amount => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);

export default function DemoPage() {
  const [businessName, setBusinessName] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [started, setStarted] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingQuantity, setPendingQuantity] = useState(null);
  const [cart, setCart] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [received, setReceived] = useState('');
  const [adjust, setAdjust] = useState({ kind: 'descuento', pct: 0, cardType: 'Tarjeta de crédito' });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [draft, setDraft] = useState({ kind: 'descuento', pct: '', cardType: 'Tarjeta de crédito' });
  const [notice, setNotice] = useState(null);
  const [finished, setFinished] = useState(null);
  const [now, setNow] = useState(null);
  const lastAdjustEnter = useRef(0);
  const searchRef = useRef(null);

  useEffect(() => { if (started) searchRef.current?.focus(); }, [started]);
  useEffect(() => {
    if (notice?.type !== 'ok') return;
    const timer = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const updateClock = () => {
      const current = new Date();
      setNow({
        date: current.toLocaleDateString('es-AR'),
        time: current.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    };

    updateClock();
    const timer = setInterval(updateClock, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    document
      .querySelector(`[data-product-id="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const products = PRODUCTS.filter(product =>
    `${product.barcode} ${product.name}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  const subtotal = useMemo(
    () => PRODUCTS.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0),
    [cart]
  );
  const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const adjustAmount = Math.round((subtotal * adjust.pct) / 100) * (adjust.kind === 'descuento' ? -1 : 1);
  const total = subtotal + adjustAmount;
  const receivedNumber = Number(received) || 0;
  const cashShort = paymentMethod === 'Efectivo' && received !== '' && receivedNumber < total;
  const change = paymentMethod === 'Efectivo' && receivedNumber > total ? receivedNumber - total : 0;
  const inCart = Boolean(selectedId && cart[selectedId]);

  function add(product, quantity = pendingQuantity || 1) {
    const current = cart[product.id] || 0;
    const next = nextScannedQuantity(current, quantity, product.stock);
    if (next === null) {
      setNotice({ type: 'error', text: `Stock disponible de ${product.name}: ${product.stock}.${pendingQuantity && pendingQuantity === quantity ? ` La cantidad ${quantity} sigue pendiente.` : ''}` });
      setSearch('');
      searchRef.current?.focus();
      return;
    }
    setFinished(null);
    setCart(items => ({ ...items, [product.id]: next }));
    setSelectedId(product.id);
    setPendingQuantity(null);
    setSearch('');
    setNotice({ type: 'ok', text: `${quantity} × ${product.name} agregado${quantity === 1 ? '' : 's'} al ticket.` });
    searchRef.current?.focus();
  }

  // Escribir "3*código" y Enter agrega 3 unidades; Enter solo agrega 1
  function submitSearch(event) {
    event.preventDefault();
    const command = parseQuantityCommand(search);
    if (command) {
      if (command.error) setNotice({ type: 'error', text: command.error });
      else { setPendingQuantity(command.quantity); setSearch(''); setNotice(null); }
      searchRef.current?.focus();
      return;
    }
    if (!search.trim()) {
      if (pendingQuantity) return;
      const product = PRODUCTS.find(item => item.id === selectedId) || products[0];
      if (product) add(product);
      return;
    }

    const match = search.trim().match(/^(?:(\d{1,3})\s*\*\s*)?(.+)$/);
    if (!match) return;
    const quantity = Math.max(1, Number(match[1]) || 1);
    const term = match[2].trim().toLowerCase();
    const product =
      PRODUCTS.find(item => item.barcode === term) ||
      PRODUCTS.find(item => `${item.barcode} ${item.name}`.toLowerCase().includes(term));
    if (!product) {
      setNotice({ type: 'error', text: `No se encontró "${match[2].trim()}".` });
      setSearch('');
      searchRef.current?.focus();
      return;
    }
    add(product, match[1] ? quantity : pendingQuantity || 1);
  }

  function removeSelected() {
    if (!inCart) return;
    const product = PRODUCTS.find(item => item.id === selectedId);
    setCart(items => {
      const { [selectedId]: removed, ...rest } = items;
      return rest;
    });
    setNotice({ type: 'ok', text: `Producto eliminado: ${product.name}` });
  }

  function decreaseSelected() {
    if (!inCart) return;
    setCart(items => {
      const quantity = items[selectedId];
      if (quantity <= 1) {
        const { [selectedId]: removed, ...rest } = items;
        return rest;
      }
      return { ...items, [selectedId]: quantity - 1 };
    });
  }

  function openAdjust() {
    setDraft({
      kind: adjust.kind,
      pct: adjust.pct ? String(adjust.pct) : '',
      cardType: adjust.cardType || 'Tarjeta de crédito',
    });
    setAdjustOpen(true);
  }

  function applyAdjust(event) {
    event.preventDefault();
    const pct = Math.min(100, Math.max(0, Number(draft.pct) || 0));
    setAdjust({ kind: draft.kind, pct, cardType: draft.cardType });
    setAdjustOpen(false);
  }

  function navigateAdjust(event) {
    const key = event.key;
    const group = event.target.closest('[data-keyboard-group]');
    if (!group) return;

    if (key === 'Enter') {
      const currentTime = Date.now();
      const isDoubleEnter = currentTime - lastAdjustEnter.current < 600;
      lastAdjustEnter.current = currentTime;
      if (!isDoubleEnter) return;

      event.preventDefault();
      const nextSelector = {
        'adjust-kind': draft.kind === 'recargo'
          ? `[data-adjust-card-type="${draft.cardType}"]`
          : '[data-adjust-kind="recargo"]',
        'adjust-card': '[data-adjust-action="apply"]',
        'adjust-actions': '[data-adjust-action="apply"]',
      }[group.dataset.keyboardGroup];
      if (nextSelector) event.currentTarget.querySelector(nextSelector)?.focus();
      return;
    }

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const buttons = [...group.querySelectorAll('button')];
      const currentIndex = buttons.indexOf(event.target);
      if (currentIndex < 0 || buttons.length < 2) return;
      event.preventDefault();
      const direction = key === 'ArrowRight' ? 1 : -1;
      buttons[(currentIndex + direction + buttons.length) % buttons.length].focus();
      return;
    }

    if (key === 'ArrowDown' && group.dataset.keyboardGroup === 'adjust-kind') {
      event.preventDefault();
      const nextSelector = draft.kind === 'recargo'
        ? `[data-adjust-card-type="${draft.cardType}"]`
        : '[data-adjust-action="apply"]';
      event.currentTarget.querySelector(nextSelector)?.focus();
    } else if (key === 'ArrowUp' && group.dataset.keyboardGroup === 'adjust-kind') {
      event.preventDefault();
      event.currentTarget.querySelector('[data-adjust-action="apply"]')?.focus();
    } else if (key === 'ArrowUp' && group.dataset.keyboardGroup === 'adjust-card') {
      event.preventDefault();
      event.currentTarget.querySelector('[data-adjust-kind="recargo"]')?.focus();
    } else if (key === 'ArrowDown' && group.dataset.keyboardGroup === 'adjust-card') {
      event.preventDefault();
      event.currentTarget.querySelector('[data-adjust-action="apply"]')?.focus();
    } else if (key === 'ArrowUp' && group.dataset.keyboardGroup === 'adjust-actions') {
      event.preventDefault();
      const selector = draft.kind === 'recargo'
        ? `[data-adjust-card-type="${draft.cardType}"]`
        : `[data-adjust-kind="${draft.kind}"]`;
      event.currentTarget.querySelector(selector)?.focus();
    }
  }

  function closeReceipt() {
    if (!total || cashShort) return;
    setFinished({ total, change, method: paymentMethod });
    setCart({});
    setSelectedId(null);
    setReceived('');
    setAdjust({ kind: 'descuento', pct: 0, cardType: 'Tarjeta de crédito' });
    setNotice(null);
  }

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toUpperCase();
      if (!started) return;
      const target = event.target;
      const catalogHasFocus = Boolean(
        target?.closest?.('.demo-search, .demo-table-wrap') || target === document.body
      );

      if (adjustOpen) {
        if (key === 'ESCAPE') { event.preventDefault(); setAdjustOpen(false); requestAnimationFrame(() => searchRef.current?.focus()); }
        return;
      }
      if (key === 'F1') {
        event.preventDefault();
        event.stopPropagation();
        removeSelected();
      } else if (key === 'F2') {
        event.preventDefault();
        event.stopPropagation();
        openAdjust();
      } else if (key === 'F3') {
        event.preventDefault();
        event.stopPropagation();
        closeReceipt();
      } else if (key === 'ESCAPE') {
        if (!search && !pendingQuantity) return;
        event.preventDefault();
        setSearch('');
        setPendingQuantity(null);
        setNotice(null);
        searchRef.current?.focus();
      } else if (catalogHasFocus && (key === 'ARROWDOWN' || key === 'ARROWUP')) {
        if (!products.length) return;
        event.preventDefault();
        const index = products.findIndex(product => product.id === selectedId);
        const step = key === 'ARROWDOWN' ? 1 : -1;
        const next = Math.min(products.length - 1, Math.max(0, (index < 0 ? (step > 0 ? -1 : products.length) : index) + step));
        setSelectedId(products[next].id);
      } else if (catalogHasFocus && !search.trim() && (key === 'ARROWRIGHT' || key === 'ARROWLEFT')) {
        event.preventDefault();
        const selectedProduct = products.find(product => product.id === selectedId) || products[0];
        if (key === 'ARROWRIGHT' && selectedProduct) {
          add(selectedProduct);
        } else if (key === 'ARROWLEFT') {
          decreaseSelected();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [started, adjustOpen, products, selectedId, total, cashShort, search, pendingQuantity]);

  return (
    <>
      {!started && <div className="demo-start">
        <form className="demo-start-card" onSubmit={event => { event.preventDefault(); setBusinessName(businessName.trim()); setCashierName(cashierName.trim()); setStarted(true); }}>
          <span className="demo-shortcut-key">DEMO</span>
          <h1>Prepará tu caja</h1>
          <p>Ingresá el nombre de tu negocio y del cajero para personalizar esta demostración.</p>
          <label>Nombre del negocio<input value={businessName} onChange={event => setBusinessName(event.target.value)} required minLength={2} maxLength={60} autoFocus placeholder="Mi negocio" /></label>
          <label>Nombre del cajero<input value={cashierName} onChange={event => setCashierName(event.target.value)} required minLength={2} maxLength={60} placeholder="Nombre del cajero" /></label>
          <button type="submit">Entrar a la demo</button>
        </form>
      </div>}
      <div className={`demo-screen${started ? ' demo-screen-enter' : ''}`}>
        <div className="demo-frame">
          <header className="demo-left-head">
            <div className="demo-bar">
              <strong className="demo-business">{businessName || 'NOMBRE NEGOCIO'}</strong>
              <span className="demo-spacer" />
              <div className="demo-chip">Cajero: <strong>{cashierName || 'Nombre cajero'}</strong></div>
              <div className="demo-chip demo-date">{now?.date || '—'}</div>
              <div className="demo-chip"><strong>{now?.time || '—'}</strong></div>
            </div>
            <div className="demo-shortcuts">
              <button type="button" className="demo-shortcut" onClick={removeSelected} disabled={!inCart}>
                <span className="demo-shortcut-key">F1</span>
                <span className="demo-shortcut-label">Eliminar<br />producto</span>
              </button>
              <button type="button" className="demo-shortcut" onClick={openAdjust}>
                <span className="demo-shortcut-key">F2</span>
                <span className="demo-shortcut-label">Descuentos<br />y recargos</span>
              </button>
              <button type="button" className="demo-shortcut" onClick={closeReceipt} disabled={!total || cashShort}>
                <span className="demo-shortcut-key">F3</span>
                <span className="demo-shortcut-label">Cerrar<br />comprobante</span>
              </button>
            </div>
          </header>

          <section className="demo-grid">
            <form className="demo-search" onSubmit={submitSearch}>
              <Search size={18} />
              <input
                ref={searchRef}
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault(); }}
                placeholder="Buscar por código o descripción (3*código para cantidad)"
                aria-label="Buscar por código o descripción"
                autoComplete="off"
                autoFocus
              />
              {pendingQuantity && <span className="demo-pending" role="status">Cantidad: {pendingQuantity}</span>}
            </form>
            <div className="demo-table-wrap" tabIndex={0} aria-label="Lista de productos">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr
                      key={product.id}
                      data-product-id={product.id}
                      className={`${product.id === selectedId ? 'is-selected' : ''} ${cart[product.id] ? 'in-cart' : ''}`}
                      onClick={() => add(product)}
                    >
                      <td>{product.barcode}</td>
                      <td>{product.name}</td>
                      <td><span className="demo-qty">{cart[product.id] || 0}</span></td>
                      <td>{money(product.price)}</td>
                      <td>{money(product.price * (cart[product.id] || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="demo-summary">
            <div className="demo-total">
              <span className="demo-total-label">Total a cobrar</span>
              <strong className="demo-total-amount">{money(total)}</strong>
              <span className="demo-total-meta">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</span>
            </div>

            <div className="demo-payment">
              <h2>Información de pago</h2>

              <div className="demo-lines">
                <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div>
                  <span>
                    {adjust.kind === 'descuento' ? 'Descuento' : `Recargo · ${adjust.cardType}`} ({adjust.pct}%)
                  </span>
                  <strong>{adjustAmount ? money(adjustAmount) : '—'}</strong>
                </div>
              </div>

              <div className="demo-label">
                Medio de pago
                <div className="demo-methods">
                  {METHODS.map(method => (
                    <button
                      key={method}
                      type="button"
                      className="demo-method"
                      aria-pressed={paymentMethod === method}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Efectivo' && (
                <>
                  <label className="demo-label">
                    Efectivo recibido
                    <input
                      className="demo-input"
                      inputMode="numeric"
                      value={received}
                      onChange={event => setReceived(event.target.value.replace(/\D/g, ''))}
                      placeholder={total ? String(total) : '0'}
                    />
                  </label>
                  <div className={`demo-change ${cashShort ? 'is-short' : ''}`}>
                    <span>{cashShort ? 'Falta' : 'Vuelto'}</span>
                    <strong>{money(cashShort ? total - receivedNumber : change)}</strong>
                  </div>
                </>
              )}

              {notice && (
                <p className={`demo-notice ${notice.type === 'error' ? 'is-error' : ''}`} role="status">
                  {notice.text}
                </p>
              )}
              {finished && (
                <p className="demo-success" role="status">
                  Cobro de prueba realizado: {money(finished.total)} con {finished.method.toLowerCase()}
                  {finished.change ? ` · vuelto ${money(finished.change)}` : ''}. No se guardó ninguna venta.
                </p>
              )}

              <button className="demo-checkout" type="button" disabled={!total || cashShort} onClick={closeReceipt}>
                {total ? `Cobrar ${money(total)}` : 'Simular cobro'}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {adjustOpen && (
        <div className="demo-modal" onClick={() => setAdjustOpen(false)}>
          <form
            className="demo-dialog"
            onClick={event => event.stopPropagation()}
            onKeyDown={navigateAdjust}
            onSubmit={applyAdjust}
          >
            <h3>Descuentos y recargos</h3>
            <div className="demo-seg" data-keyboard-group="adjust-kind">
              {['descuento', 'recargo'].map(kind => (
                <button
                  key={kind}
                  type="button"
                  className="demo-method"
                  data-adjust-kind={kind}
                  autoFocus={draft.kind === kind}
                  aria-pressed={draft.kind === kind}
                  onClick={() => setDraft(current => ({
                    ...current,
                    kind,
                    pct: kind === 'recargo'
                      ? current.cardType === 'Tarjeta de débito' ? '5' : '10'
                      : current.kind === 'descuento' ? current.pct : '',
                  }))}
                >
                  {kind === 'descuento' ? 'Descuento' : 'Recargo'}
                </button>
              ))}
            </div>
            {draft.kind === 'recargo' && (
              <div className="demo-label">
                Tipo de tarjeta
                <div className="demo-seg" data-keyboard-group="adjust-card">
                  {['Tarjeta de crédito', 'Tarjeta de débito'].map(cardType => (
                    <button
                      key={cardType}
                      type="button"
                      className="demo-method"
                      data-adjust-card-type={cardType}
                      aria-pressed={draft.cardType === cardType}
                      onClick={() => setDraft(current => ({
                        ...current,
                        cardType,
                        pct: cardType === 'Tarjeta de débito' ? '5' : '10',
                      }))}
                    >
                      {cardType}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {draft.kind === 'recargo' && (
              <div className="demo-label">
                Porcentaje de recargo
                <strong>{draft.cardType === 'Tarjeta de débito' ? '5%' : '10%'}</strong>
              </div>
            )}
            
            <div className="demo-dialog-actions" data-keyboard-group="adjust-actions">
              <button type="button" className="demo-checkout is-light" data-adjust-action="cancel" onClick={() => setAdjustOpen(false)}>Cancelar</button>
              <button type="submit" className="demo-checkout" data-adjust-action="apply">Aplicar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
