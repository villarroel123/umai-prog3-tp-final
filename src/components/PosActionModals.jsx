'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import PaymentArea from './PaymentArea';

function Modal({ title, close, children, className = '' }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section className={`modal pos-action-modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div><span className="eyebrow">PUNTO DE VENTA</span><h2>{title}</h2></div><button type="button" onClick={close} aria-label="Cerrar"><X size={20}/></button></div>
      {children}
    </section>
  </div>;
}

export function ReturnProductModal({ value, setValue, error, close, submit }) {
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);
  return <Modal title="Devolver producto de la cuenta" close={close}>
    <form onSubmit={submit}>
      <label>Unidades y código<input ref={inputRef} value={value} onChange={event => setValue(event.target.value)} placeholder="3x7790001 o solo el código" autoComplete="off"/></label>
      <p>Ingresá una cantidad con código, o solo el código para devolver todas las unidades.</p>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <button className="button-primary" type="submit">Confirmar devolución</button>
    </form>
  </Modal>;
}

export function ConfirmAccountReturnModal({ close, confirm }) {
  return <Modal title="Devolver toda la cuenta" close={close}>
    <p>Se quitarán todos los productos del ticket actual. Esta acción no se puede deshacer.</p>
    <div className="receipt-actions"><button type="button" onClick={close}>Cancelar</button><button type="button" className="button-primary" onClick={confirm}>Vaciar cuenta</button></div>
  </Modal>;
}

export function AdjustmentModal({ selectedLine, close, apply }) {
  const [scope, setScope] = useState(selectedLine ? 'product' : 'account');
  const [type, setType] = useState('discount');
  const [kind, setKind] = useState('percent');
  const [value, setValue] = useState('10');
  const [error, setError] = useState('');
  const valueRef = useRef(null);
  useEffect(() => valueRef.current?.focus(), []);

  function submit(event) {
    event.preventDefault();
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0 || (kind === 'percent' && amount > 100)) {
      setError(kind === 'percent' ? 'El porcentaje debe estar entre 0 y 100.' : 'Ingresá un importe mayor a cero.');
      return;
    }
    if (scope === 'product' && !selectedLine) {
      setError('Seleccioná un producto de la cuenta para aplicar el ajuste.');
      return;
    }
    apply({ scope, productId: selectedLine?.productId, adjustment: kind === 'percent' ? { type, percent: amount } : { type, mode: 'fixed', amount } });
  }

  return <Modal title="Ofertas y recargos" close={close}>
    <form onSubmit={submit} className="pos-adjustment-form">
      <label>Aplicar a<select value={scope} onChange={event => setScope(event.target.value)}><option value="account">Toda la cuenta</option><option value="product">Producto seleccionado</option></select></label>
      <label>Tipo<select value={type} onChange={event => setType(event.target.value)}><option value="discount">Descuento</option><option value="surcharge">Recargo</option></select></label>
      <label>Formato<select value={kind} onChange={event => setKind(event.target.value)}><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option></select></label>
      <label>{kind === 'percent' ? 'Porcentaje' : 'Importe'}<input ref={valueRef} type="number" min="0.01" max={kind === 'percent' ? '100' : undefined} step="0.01" value={value} onChange={event => setValue(event.target.value)} required/></label>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <button className="button-primary" type="submit">Aplicar ajuste</button>
    </form>
  </Modal>;
}

export function CheckoutModal({ paymentProps, close }) {
  useEffect(() => document.querySelector('.pos-action-modal .cash-fields input')?.focus(), []);
  return <Modal title="Cobro" close={close} className="pos-checkout-modal">
    <PaymentArea {...paymentProps}/>
  </Modal>;
}
