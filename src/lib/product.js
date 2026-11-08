import { CATEGORIES, roundMoney } from './models.js';

const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const DEFAULT_CATEGORIES = CATEGORIES.map(name => ({ id: `base-${slug(name)}`, name, isDefault: true }));
export const defaultCategory = value => DEFAULT_CATEGORIES.find(item => item.id === value || item.name === value);

export function normalizeProduct(id, data) {
  const category = data.category || 'Otros';
  const barcode = data.barcode ?? (data.code?.startsWith('INT-') ? '' : data.code || '');
  return {
    id, ...data, businessId: data.businessId || data.ownerId,
    code: data.code || barcode, barcode, category,
    categoryId: data.categoryId || defaultCategory(category)?.id || '',
    description: data.description || '',
    salePrice: data.salePrice ?? data.price ?? 0,
    price: data.price ?? data.salePrice ?? 0,
    costPrice: data.costPrice ?? null,
    minStock: data.minStock ?? 5,
    imageUrl: data.imageUrl || '',
    isActive: data.isActive !== false && !data.archivedAt,
  };
}

export function parseProduct(body) {
  const name = String(body.name || '').trim();
  const barcode = String(body.barcode ?? body.code ?? '').trim();
  const description = String(body.description || '').trim();
  const categoryId = String(body.categoryId || '').trim();
  const unit = String(body.unit || 'unidad').trim();
  const salePrice = Number(body.salePrice ?? body.price);
  const costPrice = body.costPrice === '' || body.costPrice == null ? null : Number(body.costPrice);
  const stock = Number(body.stock ?? 0);
  const minStock = Number(body.minStock ?? 5);
  const imageUrl = String(body.imageUrl || '').trim();
  if (name.length < 2 || name.length > 80) throw new Error('El nombre debe tener entre 2 y 80 caracteres.');
  if (barcode && !/^[A-Za-z0-9-]{3,32}$/.test(barcode)) throw new Error('El código de barras debe tener entre 3 y 32 letras, números o guiones.');
  if (description.length > 500) throw new Error('La descripción no puede superar 500 caracteres.');
  if (!['unidad', 'kilogramo', 'litro'].includes(unit)) throw new Error('Seleccioná una unidad válida.');
  if (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice > 100000000) throw new Error('Ingresá un precio de venta válido.');
  if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > 100000000)) throw new Error('Ingresá un precio de compra válido.');
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) throw new Error('Ingresá un stock entero válido.');
  if (!Number.isInteger(minStock) || minStock < 0 || minStock > 1000000) throw new Error('Ingresá un stock mínimo entero válido.');
  if (imageUrl && !/^\/assets\/products\/[a-z0-9-]+\.webp$/.test(imageUrl)) throw new Error('Seleccioná una imagen local válida.');
  return { name, barcode, categoryId, description, salePrice: roundMoney(salePrice), costPrice: costPrice === null ? null : roundMoney(costPrice), stock, minStock, unit, imageUrl };
}

export async function resolveCategory(database, ownerId, categoryId, fallbackName) {
  const base = defaultCategory(categoryId || fallbackName);
  if (base) return base;
  if (!categoryId) throw new Error('Seleccioná una categoría válida.');
  const snap = await database.collection('categories').doc(categoryId).get();
  if (!snap.exists || snap.data().ownerId !== ownerId || snap.data().archivedAt) throw new Error('Seleccioná una categoría válida.');
  return { id: snap.id, name: snap.data().name, isDefault: false };
}

export async function codeTaken(database, ownerId, code, exceptId) {
  if (!code) return false;
  const snap = await database.collection('products').where('ownerId', '==', ownerId).get();
  return snap.docs.some(doc => doc.id !== exceptId && !doc.data().archivedAt && (doc.data().barcode || doc.data().code)?.toLowerCase() === code.toLowerCase());
}
