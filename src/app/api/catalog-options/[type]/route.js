import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { catalogCollection } from '@/lib/catalog-options';
import { fail, json, safeError } from '@/lib/api';

export async function GET(_request, { params }) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Sin permiso.', 403);
    const type = (await params).type;
    const collection = catalogCollection(type);
    if (!collection) return fail('Lista inválida.', 404);
    const snap = await db().collection(collection).where('businessId', '==', user.businessId).get();
    return json({ options: snap.docs.filter(doc => !doc.data().archivedAt).map(doc => ({ id: doc.id, name: doc.data().name })).sort((a, b) => a.name.localeCompare(b.name, 'es')) });
  } catch (error) { return safeError(error); }
}

export async function POST(request, { params }) {
  try {
    const user = await sessionUser();
    if (!user) return fail('Iniciá sesión.', 401);
    if (user.role !== 'business_owner') return fail('Sin permiso.', 403);
    const type = (await params).type;
    const collection = catalogCollection(type);
    if (!collection) return fail('Lista inválida.', 404);
    const name = String((await request.json()).name || '').trim();
    if (name.length < 2 || name.length > 60) return fail('El nombre debe tener entre 2 y 60 caracteres.');
    const database = db();
    const collectionRef = database.collection(collection);
    const existing = await collectionRef.where('businessId', '==', user.businessId).get();
    if (existing.docs.some(doc => !doc.data().archivedAt && doc.data().name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) return fail('Ese nombre ya existe.', 409);
    const now = new Date().toISOString();
    const ref = await collectionRef.add({ businessId: user.businessId, name, createdBy: user.uid, createdAt: now, updatedAt: now });
    return json({ option: { id: ref.id, name } }, 201);
  } catch (error) { return safeError(error); }
}
