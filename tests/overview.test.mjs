import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOverview } from '../src/lib/overview.js';

test('el resumen usa ventas válidas y stock real', () => {
  const now = new Date(2026, 10, 8, 18, 0);
  const sales = [
    { id: 'one', createdAt: new Date(2026, 10, 8, 10).toISOString(), total: 100, status: 'completed', items: [{ productId: 'p', name: 'Pan', quantity: 2, lineTotal: 100 }] },
    { id: 'two', createdAt: new Date(2026, 10, 8, 11).toISOString(), total: 200, status: 'voided', items: [{ productId: 'p', name: 'Pan', quantity: 4, lineTotal: 200 }] },
    { id: 'three', createdAt: new Date(2026, 10, 7, 11).toISOString(), total: 50, status: 'completed', items: [{ productId: 'p', name: 'Pan', quantity: 1, lineTotal: 50 }] },
  ];
  const result = buildOverview(sales, [{ id: 'p', name: 'Pan', stock: 4, minStock: 4 }, { id: 'q', name: 'Leche', stock: 5, minStock: 3 }], now);
  assert.equal(result.todayTotal, 100);
  assert.equal(result.todayCount, 1);
  assert.equal(result.averageTicket, 100);
  assert.equal(result.lowStock.length, 1);
  assert.equal(result.topProducts[0].quantity, 3);
  assert.equal(result.latestSales.length, 3);
});

test('sin ventas el resumen queda en cero', () => {
  const result = buildOverview([], [], new Date(2026, 10, 8, 18));
  assert.equal(result.todayTotal, 0);
  assert.equal(result.todayCount, 0);
  assert.equal(result.latestSales.length, 0);
});
