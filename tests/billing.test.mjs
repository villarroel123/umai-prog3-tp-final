import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAdjustment, priceTicket } from '../src/lib/billing.js';

const yogurt = { id: 'y', code: '7790001', name: 'Yogur', category: 'Lácteos', unit: 'unidad', price: 2000 };
const juice = { id: 'j', code: '7790002', name: 'Jugo', category: 'Bebidas', unit: 'unidad', price: 1500 };

test('combina descuento por producto y recargo sobre el subtotal ajustado', () => {
  const result = priceTicket([
    { product: yogurt, quantity: 1, adjustment: { type: 'discount', percent: 10 } },
    { product: juice, quantity: 3, adjustment: { type: 'none', percent: 0 } },
  ], { type: 'surcharge', percent: 5 });
  assert.equal(result.baseSubtotal, 6500);
  assert.equal(result.items[0].lineTotal, 1800);
  assert.equal(result.subtotal, 6300);
  assert.equal(result.saleAdjustmentAmount, 315);
  assert.equal(result.total, 6615);
});

test('redondea cada renglón y mantiene importes auditables', () => {
  const result = priceTicket([{ product: { ...juice, price: 9.99 }, quantity: 3, adjustment: { type: 'discount', percent: 12.5 } }]);
  assert.equal(result.items[0].baseTotal, 29.97);
  assert.equal(result.items[0].adjustmentAmount, -3.75);
  assert.equal(result.total, 26.22);
});

test('rechaza porcentajes fuera de rango', () => {
  assert.throws(() => normalizeAdjustment({ type: 'discount', percent: 120 }), /porcentaje/);
  assert.throws(() => normalizeAdjustment({ type: 'surcharge', percent: -1 }), /porcentaje/);
});
