const collections = { brands: 'brands', suppliers: 'suppliers' };

export function catalogCollection(type) {
  return Object.hasOwn(collections, type) ? collections[type] : null;
}

export async function resolveCatalogOption(database, type, businessId, id) {
  if (!id) return { id: '', name: '' };
  const collection = catalogCollection(type);
  if (!collection) throw new Error('Opción de catálogo inválida.');
  const snap = await database.collection(collection).doc(id).get();
  if (!snap.exists || snap.data().businessId !== businessId || snap.data().archivedAt) throw new Error(`Seleccioná ${type === 'brands' ? 'una marca válida' : 'un proveedor válido'}.`);
  return { id: snap.id, name: snap.data().name };
}
