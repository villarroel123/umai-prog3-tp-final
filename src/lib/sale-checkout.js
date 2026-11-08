import { normalizeAdjustment } from './billing.js';
import { roundMoney } from './models.js';

const methods = new Set(['cash', 'card', 'transfer']);
const cents = value => Math.round(value * 100);

function amount(value, label) {
  if (value === '' || value === null || value === undefined) throw new Error(`${label} inválido.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100000000 || Math.abs(number * 100 - cents(number)) > 1e-6) {
    throw new Error(`${label} inválido.`);
  }
  return roundMoney(number);
}

export function parseCheckout(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Datos de cobro inválidos.');
  const checkoutId = String(body.checkoutId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutId)) throw new Error('Identificador de cobro inválido.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new Error('Agregá entre 1 y 50 productos.');
  const requested = new Map();
  for (const item of body.items) {
    if (!item || typeof item !== 'object') throw new Error('Revisá los productos.');
    const id = String(item.productId || '');
    const quantity = Number(item.quantity);
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error('Revisá las cantidades.');
    if (requested.has(id)) throw new Error('No repitas un producto en el ticket.');
    requested.set(id, { quantity, adjustment: normalizeAdjustment(item.adjustment) });
  }
  if (!Array.isArray(body.payments) || body.payments.length < 1 || body.payments.length > 5) throw new Error('Agregá entre 1 y 5 medios de pago.');
  const payments = body.payments.map(payment => {
    if (!payment || typeof payment !== 'object' || !methods.has(payment.method)) throw new Error('Revisá los medios de pago.');
    const paid = amount(payment.amount, 'Importe del pago');
    if (paid <= 0) throw new Error('El importe de cada pago debe ser mayor a cero.');
    const reference = String(payment.reference || '').trim();
    if (reference.length > 120) throw new Error('La referencia de pago es demasiado larga.');
    return { method: payment.method, amount: paid, reference: payment.method === 'cash' ? '' : reference };
  });
  const cashPortion = roundMoney(payments.filter(payment => payment.method === 'cash').reduce((sum, payment) => sum + payment.amount, 0));
  const amountReceived = cashPortion ? amount(body.amountReceived, 'Efectivo recibido') : 0;
  if (cashPortion && amountReceived < cashPortion) throw new Error('El efectivo recibido debe cubrir la parte en efectivo.');
  const transferConfirmed = body.transferConfirmed === true;
  if (payments.some(payment => payment.method === 'transfer') && !transferConfirmed) throw new Error('Confirmá que recibiste la transferencia antes de registrar la venta.');
  const customerName = String(body.customerName || '').trim();
  if (customerName.length > 80) throw new Error('El nombre del cliente es demasiado largo.');
  return { checkoutId, requested, adjustment: normalizeAdjustment(body.adjustment), payments, cashPortion, amountReceived, transferConfirmed, customerName };
}

export function assertPaymentTotal(payments, total) {
  if (!Number.isFinite(total) || total <= 0 || cents(total) !== cents(payments.reduce((sum, payment) => sum + payment.amount, 0))) {
    throw new Error('Los pagos deben sumar el total exacto de la venta.');
  }
}
