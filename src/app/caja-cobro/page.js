'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

const DEMO_CSS = `
.demo-screen{position:fixed;inset:0;z-index:40;width:100%;height:100vh;height:100dvh;padding:16px;overflow:hidden;background:#efeaf7;color:#1c1b22;font-family:Inter,'Segoe UI',system-ui,Arial,sans-serif;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.demo-screen *{box-sizing:border-box}
.demo-frame{width:100%;height:100%;min-height:0;display:grid;grid-template-columns:minmax(0,2.4fr) minmax(300px,1fr);grid-template-rows:auto minmax(0,1fr);gap:14px}

/* Cabecera */
.demo-left-head{grid-column:1;grid-row:1;min-width:0;display:grid;gap:12px}
.demo-bar{height:56px;display:flex;align-items:center;gap:12px;padding:0 18px;background:#fff;border:1px solid #e2dcee;border-radius:12px;box-shadow:0 1px 2px rgba(60,30,110,.06)}
.demo-business{font-size:clamp(16px,1.8vw,20px);font-weight:800;letter-spacing:.01em;color:#7a3fd0;white-space:nowrap}
.demo-spacer{flex:1}
.demo-chip{display:flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;background:#f3ecfd;color:#4b2a85;font-size:12.5px;white-space:nowrap}
.demo-chip strong{font-weight:700}
.demo-shortcuts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
button.demo-shortcut{min-width:0;display:flex;align-items:center;gap:12px;padding:8px 14px;background:#fff;border:1px solid #e2dcee;border-radius:10px;color:#1c1b22;font:inherit;text-align:left;cursor:pointer;box-shadow:0 1px 2px rgba(60,30,110,.06);transition:border-color .15s,background .15s}
button.demo-shortcut:not(:disabled):hover{border-color:#a66de8;background:#faf6fe}
button.demo-shortcut:disabled{opacity:.45;cursor:not-allowed}
.demo-shortcut-key{flex:none;min-width:46px;height:36px;display:grid;place-items:center;padding:0 8px;border:1px solid #d8c6f3;border-bottom-width:3px;border-radius:8px;background:#f3ecfd;color:#5b2da3;font-size:14px;font-weight:700}
button.demo-shortcut:not(:disabled):hover .demo-shortcut-key{background:#a66de8;border-color:#8f4fd6;color:#fff}
.demo-shortcut-label{font-size:12.5px;font-weight:600;line-height:1.25}

/* Tabla */
.demo-grid{grid-column:1;grid-row:2;min-width:0;min-height:0;display:grid;grid-template-rows:54px minmax(0,1fr);background:#fff;border:1px solid #e2dcee;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(60,30,110,.06)}
.demo-search{margin:0;padding:0 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #eee9f6;color:#8a63c4}
.demo-search:focus-within{background:#faf7fe}
.demo-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#1c1b22;font:inherit;font-size:14px}
.demo-search input::placeholder{color:#9a94ac}
.demo-table-wrap{min-height:0;overflow:auto}
.demo-table{width:100%;border-collapse:collapse;table-layout:fixed}
.demo-table thead{position:sticky;top:0;z-index:1}
.demo-table th{height:38px;padding:0 16px;background:#f6f1fd;border-bottom:1px solid #e7dcf8;color:#5b2da3;font-size:11.5px;font-weight:700;text-align:right}
.demo-table th:nth-child(1),.demo-table th:nth-child(2){text-align:left}
.demo-table th:nth-child(3){text-align:center}
.demo-table th:nth-child(1){width:21%}.demo-table th:nth-child(2){width:27%}.demo-table th:nth-child(3){width:12%}.demo-table th:nth-child(4){width:20%}.demo-table th:nth-child(5){width:20%}
.demo-table td{height:54px;padding:0 16px;border-bottom:1px solid #f0ecf6;background:#fff;font-size:13px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.demo-table td:nth-child(1){text-align:left;color:#77718a;font-size:12px}
.demo-table td:nth-child(2){text-align:left;font-weight:600}
.demo-table td:nth-child(3){text-align:center}
.demo-table td:nth-child(5){font-weight:700}
.demo-table tbody tr{cursor:pointer;transition:background .12s}
.demo-table tbody tr:hover td{background:#faf6fe}
.demo-table tbody tr.is-selected td{background:#f3eafd}
.demo-table tbody tr.is-selected td:first-child{box-shadow:inset 4px 0 0 #a66de8}
.demo-qty{display:inline-grid;place-items:center;min-width:30px;height:24px;padding:0 9px;border-radius:999px;background:#f1eef6;color:#9a94ac;font-size:12px;font-weight:700}
.in-cart .demo-qty{background:#a66de8;color:#fff}

/* Resumen y pago */
.demo-summary{grid-column:2;grid-row:1/3;min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:14px}
.demo-total{padding:22px 24px;border-radius:12px;background:linear-gradient(145deg,#a66de8,#7a3fd0);color:#fff;box-shadow:0 10px 24px rgba(122,63,208,.28)}
.demo-total-label{display:block;font-size:13px;font-weight:600;opacity:.88}
.demo-total-amount{display:block;margin-top:4px;font-size:clamp(32px,4vw,50px);font-weight:800;line-height:1.1;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis}
.demo-total-meta{display:block;margin-top:6px;font-size:12px;opacity:.85}
.demo-payment{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:14px;padding:20px;background:#fff;border:1px solid #e2dcee;border-radius:12px;box-shadow:0 1px 2px rgba(60,30,110,.06)}
.demo-payment h2{margin:0;font-size:17px;font-weight:700}
.demo-lines{display:grid;border:1px solid #eee9f6;border-radius:10px}
.demo-lines div{display:flex;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid #f0ecf6;font-size:13px;color:#5d5870}
.demo-lines div:last-child{border:0}
.demo-lines strong{color:#1c1b22}
.demo-label{display:grid;gap:8px;font-size:12.5px;font-weight:600;color:#5d5870}
.demo-methods{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.demo-method{height:40px;border:1px solid #d9d2e8;border-radius:8px;background:#fff;color:#1c1b22;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
.demo-method:hover{border-color:#a66de8}
.demo-method[aria-pressed=true]{border-color:#a66de8;background:#f3ecfd;color:#4b2a85}
.demo-input{width:100%;height:44px;padding:0 14px;border:1px solid #d9d2e8;border-radius:8px;background:#fff;color:#1c1b22;font:inherit;font-size:18px;font-weight:600;text-align:right}
.demo-input::placeholder{color:#b3adc4}
.demo-change{display:flex;justify-content:space-between;align-items:baseline;padding:12px 14px;border-radius:10px;background:#f6f1fd;font-size:13px;font-weight:600;color:#4b2a85}
.demo-change strong{font-size:22px;color:#1c1b22}
.demo-change.is-short{background:#fdecec;color:#9b1c1c}
.demo-change.is-short strong{color:#9b1c1c}
.demo-checkout{width:100%;min-height:54px;margin-top:auto;border:0;border-radius:10px;background:#17171b;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:background .15s}
.demo-checkout:hover:not(:disabled){background:#2d2b38}
.demo-checkout:disabled{opacity:.4;cursor:not-allowed}
.demo-notice{margin:0;font-size:12.5px;line-height:1.4;font-weight:600;color:#1f6b3a}
.demo-notice.is-error{color:#9b1c1c}
.demo-success{margin:0;padding:12px 14px;border-radius:10px;background:#f3ecfd;border:1px solid #e0d0f7;font-size:12.5px;line-height:1.45;color:#4b2a85}

/* Diálogo de descuentos */
.demo-modal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(23,23,27,.55)}
.demo-dialog{width:min(380px,92vw);padding:22px;display:grid;gap:16px;border-radius:14px;background:#fff;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.demo-dialog h3{margin:0;font-size:18px;font-weight:700}
.demo-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.demo-dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.demo-dialog-actions .demo-checkout{margin:0;min-height:46px}
.demo-checkout.is-light{background:#f1eef6;color:#1c1b22}
.demo-checkout.is-light:hover:not(:disabled){background:#e5dff0}
.demo-screen button:focus-visible,.demo-screen input:focus-visible,.demo-modal button:focus-visible,.demo-modal input:focus-visible{outline:3px solid #5b2da3;outline-offset:2px}
.demo-search input:focus-visible{outline:0}
.demo-start{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:20px;background:rgba(23,23,27,.38);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.demo-start-card{width:min(440px,100%);padding:30px;display:grid;gap:17px;border:1px solid #e2dcee;border-radius:16px;background:rgba(255,255,255,.97);box-shadow:0 24px 70px rgba(0,0,0,.25);animation:demo-card-in .28s ease-out both}
@keyframes demo-card-in{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.demo-screen.demo-screen-enter{animation:demo-screen-in .38s ease-out both}
@keyframes demo-screen-in{from{opacity:.72;transform:scale(1.012);filter:blur(3px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
@media(prefers-reduced-motion:reduce){.demo-start-card,.demo-screen.demo-screen-enter{animation:none}}
.demo-start-card h1{margin:0;font-size:25px;letter-spacing:-.03em}
.demo-start-card p{margin:0;color:#716b7e;font-size:14px;line-height:1.5}
.demo-start-card label{display:grid;gap:7px;color:#5d5870;font-size:13px;font-weight:600}
.demo-start-card input{width:100%;height:46px;padding:0 13px;border:1px solid #d9d2e8;border-radius:8px;background:#fff;color:#1c1b22;font:inherit;font-size:15px}
.demo-start-card button{width:100%;min-height:50px;margin-top:3px;border:0;border-radius:9px;background:#7a3fd0;color:#fff;font:inherit;font-weight:700;cursor:pointer}
.demo-start-card button:hover{background:#9256d2}

@media(max-width:900px){
.demo-screen{padding:10px;overflow:auto}
.demo-frame{height:auto;min-height:100%;grid-template-columns:minmax(0,1fr);grid-template-rows:auto 440px auto;gap:10px}
.demo-grid{grid-column:1;grid-row:2}
.demo-summary{grid-column:1;grid-row:3}
.demo-chip.demo-date{display:none}
button.demo-shortcut{padding:6px 8px;gap:8px}
.demo-shortcut-key{min-width:36px;height:32px;font-size:13px}
.demo-shortcut-label{font-size:11px}
}
@media(max-width:560px){
.demo-bar{padding:0 12px;gap:8px}
.demo-chip{padding:0 10px;font-size:11px}
.demo-shortcut-label br{display:none}
.demo-table th,.demo-table td{padding:0 10px}
.demo-table th:nth-child(1),.demo-table td:nth-child(1){display:none}
.demo-table th:nth-child(2){width:38%}.demo-table th:nth-child(3){width:14%}.demo-table th:nth-child(4){width:24%}.demo-table th:nth-child(5){width:24%}
}
`;

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

  function add(product, quantity = 1) {
    setFinished(null);
    const current = cart[product.id] || 0;
    const next = Math.min(current + quantity, product.stock);
    setNotice(
      current + quantity > product.stock
        ? { type: 'error', text: `Stock disponible de ${product.name}: ${product.stock}` }
        : null
    );
    setCart(items => ({ ...items, [product.id]: next }));
    setSelectedId(product.id);
  }

  // Escribir "3*código" y Enter agrega 3 unidades; Enter solo agrega 1
  function submitSearch(event) {
    event.preventDefault();
    if (!search.trim()) {
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
      return;
    }
    add(product, quantity);
    setSearch('');
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
      const target = event.target;
      const catalogHasFocus = Boolean(
        target?.closest?.('.demo-search, .demo-table-wrap') || target === document.body
      );

      if (adjustOpen) {
        if (key === 'ESCAPE') setAdjustOpen(false);
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
        setSearch('');
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
  }, [adjustOpen, products, selectedId, total, cashShort]);

  return (
    <>
      <style>{DEMO_CSS}</style>
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
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por código o descripción (3*código para cantidad)"
                aria-label="Buscar por código o descripción"
                autoComplete="off"
                autoFocus
              />
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
