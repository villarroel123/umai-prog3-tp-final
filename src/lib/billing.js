import { roundMoney } from './models.js';

export const EMPTY_ADJUSTMENT = { type: 'none', percent: 0 };
export const ADJUSTMENT_LABELS = { none: 'Sin ajuste', discount: 'Descuento', surcharge: 'Recargo' };

export function normalizeAdjustment(value) {
  if (!value || value.type === 'none') return EMPTY_ADJUSTMENT;
  const type = String(value.type || '');
  const percent = Number(value.percent);
  if (!['discount', 'surcharge'].includes(type) || !Number.isFinite(percent) || percent < 0 || percent > 100 || Math.abs(percent * 100 - Math.round(percent * 100)) > 1e-6) {
    throw new Error('El descuento o recargo debe ser un porcentaje entre 0 y 100.');
  }
  return { type, percent };
}

export function adjustmentAmount(base, adjustment) {
  const amount = roundMoney(base * adjustment.percent / 100);
  return adjustment.type === 'discount' ? -amount : adjustment.type === 'surcharge' ? amount : 0;
}

export function priceLine(product, quantity, adjustmentInput) {
  const adjustment = normalizeAdjustment(adjustmentInput);
  const baseTotal = roundMoney(product.price * quantity);
  const lineAdjustmentAmount = adjustmentAmount(baseTotal, adjustment);
  return {
    productId: product.id,
    code: product.code,
    name: product.name,
    category: product.category || 'Otros',
    unit: product.unit,
    unitPrice: product.price,
    quantity,
    baseTotal,
    adjustment,
    adjustmentAmount: lineAdjustmentAmount,
    lineTotal: roundMoney(baseTotal + lineAdjustmentAmount),
  };
}

export function priceTicket(lines, adjustmentInput) {
  const adjustment = normalizeAdjustment(adjustmentInput);
  const items = lines.map(line => priceLine(line.product, line.quantity, line.adjustment));
  const baseSubtotal = roundMoney(items.reduce((sum, item) => sum + item.baseTotal, 0));
  const lineAdjustmentsTotal = roundMoney(items.reduce((sum, item) => sum + item.adjustmentAmount, 0));
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const saleAdjustmentAmount = adjustmentAmount(subtotal, adjustment);
  const total = roundMoney(subtotal + saleAdjustmentAmount);
  return { items, baseSubtotal, lineAdjustmentsTotal, subtotal, adjustment, saleAdjustmentAmount, total };
}
