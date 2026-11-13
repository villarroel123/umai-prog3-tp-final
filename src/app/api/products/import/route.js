import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

const MAX_PRODUCTS = 2000;
const BATCH_SIZE = 400; // Firestore permite 500 operaciones por batch

const clean = value => String(value ?? '').trim();
const key = value => clean(value).toLocaleLowerCase('es');
const money = value => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') {
      return fail('Solo un propietario puede importar productos.', 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return fail('Datos inválidos.');
    }

    const incoming = Array.isArray(body.products) ? body.products : [];
    if (!incoming.length) return fail('No hay productos para importar.');
    if (incoming.length > MAX_PRODUCTS) {
      return fail(`Máximo ${MAX_PRODUCTS} productos por importación.`);
    }

    const database = db();
    const ownerId = user.businessId;
    const now = new Date().toISOString();

    // --- Categorías existentes del negocio (se buscan por nombre) ---
    const categorySnap = await database
      .collection('categories')
      .where('ownerId', '==', ownerId)
      .get();
    const categories = new Map(
      categorySnap.docs.map(doc => [key(doc.data().name), { id: doc.id, name: doc.data().name }]),
    );

    // --- Productos existentes (para actualizar por código / código de barras) ---
    const productSnap = await database
      .collection('products')
      .where('ownerId', '==', ownerId)
      .get();
    const byCode = new Map();
    productSnap.docs.forEach(doc => {
      const d = doc.data();
      if (d.code) byCode.set(key(d.code), doc.id);
      if (d.barcode) byCode.set(key(d.barcode), doc.id);
    });

    const operations = []; // { type, ref, data }
    let created = 0;
    let updated = 0;
    const skipped = [];

    for (const [index, p] of incoming.entries()) {
      const name = clean(p.name);
      if (!name) {
        skipped.push(`Fila ${index + 2}: falta el nombre.`);
        continue;
      }

      // Categoría: usa la existente o la crea
      const categoryName = clean(p.category) || 'Otros';
      let category = categories.get(key(categoryName));
      if (!category) {
        const ref = database.collection('categories').doc();
        category = { id: ref.id, name: categoryName };
        categories.set(key(categoryName), category);
        operations.push({
          type: 'set',
          ref,
          data: {
            name: categoryName,
            ownerId,
            businessId: ownerId,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      const barcode = clean(p.barcode);
      const importedCode = clean(p.code);
      const lookup = key(importedCode || barcode);
      const existingId = lookup ? byCode.get(lookup) : null;

      const salePrice = money(p.salePrice);
      const fields = {
        name,
        barcode,
        categoryId: category.id,
        category: category.name,
        unit: clean(p.unit) || 'unidad',
        stock: Math.max(0, Number(p.stock) || 0),
        salePrice,
        price: salePrice,
        netPrice: money(p.netPrice),
        vatRate: Number(p.vatRate) || 0,
        isDairy: Boolean(p.isDairy),
        isActive: p.isActive !== false,
        updatedAt: now,
      };

      if (existingId) {
        operations.push({
          type: 'update',
          ref: database.collection('products').doc(existingId),
          data: fields,
        });
        updated++;
      } else {
        const ref = database.collection('products').doc();
        const code = importedCode || barcode || `INT-${ref.id.slice(0, 12)}`;
        operations.push({
          type: 'set',
          ref,
          data: {
            ...fields,
            code,
            imageUrl: '',
            ownerId,
            businessId: ownerId,
            isSample: false,
            createdAt: now,
          },
        });
        // evita duplicados dentro del mismo archivo
        byCode.set(key(code), ref.id);
        if (barcode) byCode.set(key(barcode), ref.id);
        created++;
      }
    }

    // --- Guardado en lotes ---
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = database.batch();
      operations.slice(i, i + BATCH_SIZE).forEach(op => {
        if (op.type === 'update') batch.update(op.ref, op.data);
        else batch.set(op.ref, op.data);
      });
      await batch.commit();
    }

    return json({ created, updated, total: created + updated, skipped });
  } catch (error) {
    return safeError(error);
  }
}