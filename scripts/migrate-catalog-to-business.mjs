import { auth, db } from './firebase.mjs';
import { defaultCategory } from '../src/lib/product.js';

const email = 'sofiavillarroel15cib@gmail.com';
const user = await auth.getUserByEmail(email);
const businessId = user.uid;
const now = new Date().toISOString();
const templates = await db.collection('catalogTemplates').get();
const existingProducts = await db.collection('products').where('ownerId', '==', businessId).get();
const byCode = new Map(existingProducts.docs.map(doc => [String(doc.data().barcode || doc.data().code).toLowerCase(), doc]));
const businessRef = db.collection('businesses').doc(businessId);
const business = await businessRef.get();
if (business.exists && business.data().ownerId !== businessId) throw new Error('El negocio existente no corresponde a la cuenta indicada.');
const batch = db.batch();
batch.set(businessRef, { ownerId: businessId, name: business.data()?.name || 'Mi negocio', activeSessionId: business.data()?.activeSessionId || null, nextReceiptNumber: business.data()?.nextReceiptNumber || 1, updatedAt: now, ...(business.exists ? {} : { createdAt: now }) }, { merge: true });
batch.set(businessRef.collection('members').doc(businessId), { email, name: user.displayName || email.split('@')[0], status: 'active', joinedAt: now }, { merge: true });
batch.set(db.collection('users').doc(businessId), { uid: businessId, email, name: user.displayName || email.split('@')[0], role: 'owner', businessId, updatedAt: now }, { merge: true });
let created = 0;
for (const doc of templates.docs) {
  const template = doc.data();
  const code = String(template.code || doc.id);
  if (!/^[A-Za-z0-9-]{3,32}$/.test(code)) throw new Error(`Código inválido: ${doc.id}`);
  if (byCode.has(code.toLowerCase())) continue;
  const ref = db.collection('products').doc(`product_${businessId}_${code}`);
  const category = defaultCategory(template.category) || defaultCategory('Otros');
  if (!category || !Number.isFinite(template.price) || !Number.isInteger(template.stock)) throw new Error(`Plantilla inválida: ${code}`);
  batch.create(ref, { ownerId: businessId, businessId, name: template.name, barcode: code, code, categoryId: category.id, category: category.name, description: '', unit: template.unit || 'unidad', salePrice: template.price, price: template.price, costPrice: null, stock: template.stock, minStock: 5, imageUrl: template.imageUrl || '', isActive: true, createdAt: now, updatedAt: now });
  created++;
}
await batch.commit();
const owned = await db.collection('products').where('ownerId', '==', businessId).get();
const codes = new Set(owned.docs.map(doc => String(doc.data().barcode || doc.data().code)));
if (templates.docs.some(doc => !codes.has(String(doc.data().code || doc.id)))) throw new Error('Faltan productos convertidos. Se conservaron las plantillas para revisar.');
if (templates.size) {
  const cleanup = db.batch();
  for (const doc of templates.docs) cleanup.delete(doc.ref);
  await cleanup.commit();
}
console.log(JSON.stringify({ email, businessId, businessName: business.data()?.name || 'Mi negocio', created, products: owned.size, templatesRemoved: templates.size }));
