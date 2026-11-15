import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CATEGORIES, cashierProduct, normalizeProduct, parseProduct, resolveCategory } from '../src/lib/product.js';
import { catalogCollection, resolveCatalogOption } from '../src/lib/catalog-options.js';

test('admite código opcional y valida precios, stock e imagen local', () => {
  const product = parseProduct({ name: 'Galletitas', barcode: '', categoryId: DEFAULT_CATEGORIES[0].id, salePrice: '1250.50', costPrice: '', stock: '8', minStock: '3', unit: 'unidad', imageUrl: '' });
  assert.equal(product.barcode, '');
  assert.equal(product.salePrice, 1250.5);
  assert.equal(product.costPrice, null);
  assert.equal(product.minStock, 3);
  assert.throws(() => parseProduct({ ...product, salePrice: -1 }), /precio de venta/);
  assert.throws(() => parseProduct({ ...product, stock: 1.5 }), /stock entero/);
  assert.throws(() => parseProduct({ ...product, imageUrl: 'https://otro-sitio/imagen.jpg' }), /imagen local/);
});

test('normaliza productos anteriores sin perder precio, código o pertenencia', () => {
  const product = normalizeProduct('p1', { ownerId: 'owner-1', name: 'Leche', code: '7791234567890', category: 'Lácteos', price: 1800, stock: 2 });
  assert.equal(product.businessId, 'owner-1');
  assert.equal(product.barcode, '7791234567890');
  assert.equal(product.salePrice, 1800);
  assert.equal(product.minStock, 5);
  assert.equal(product.categoryId, 'base-lacteos');
  assert.equal(product.isActive, true);
  assert.equal(normalizeProduct('p2', { ...product, archivedAt: '2026-11-08' }).isActive, false);
});

test('una categoría ajena se rechaza', async () => {
  const database = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, id: 'c1', data: () => ({ ownerId: 'owner-2', name: 'Otra' }) }) }) }) };
  await assert.rejects(resolveCategory(database, 'owner-1', 'c1'), /categoría válida/);
});

test('el cajero recibe precio y stock, sin costo ni proveedor', () => {
  const product = normalizeProduct('p1', { ownerId: 'b1', name: 'Leche', price: 1500, costPrice: 900, supplier: 'Distribuidora', stock: 4 });
  const visible = cashierProduct(product);
  assert.equal(visible.price, 1500);
  assert.equal(visible.stock, 4);
  assert.equal('costPrice' in visible, false);
  assert.equal('supplier' in visible, false);
});

test('marca o proveedor de otro negocio no se pueden asignar', async () => {
  assert.equal(catalogCollection('constructor'), null);
  const database = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, id: 'brand1', data: () => ({ businessId: 'otro', name: 'Otra marca' }) }) }) }) };
  await assert.rejects(resolveCatalogOption(database, 'brands', 'b1', 'brand1'), /marca válida/);
});
