import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

async function getOwnerAndRegister(context) {
  const user = await sessionUser();
  if (!user || user.role !== 'business_owner') {
    return { error: fail('Iniciá sesión como propietario.', 403) };
  }

  const { id } = await context.params;
  const database = db();
  const businessRef = database.collection('businesses').doc(user.businessId);
  const ref = businessRef.collection('registers').doc(id);
  const snapshot = await ref.get();

  if (snapshot.exists && snapshot.data().archived) {
    return { error: fail('No encontramos esa caja.', 404) };
  }

  return { user, database, businessRef, ref, register: snapshot.exists ? snapshot.data() : { name: id, aliases: [] } };
}

export async function PATCH(request, context) {
  try {
    const result = await getOwnerAndRegister(context);
    if (result.error) return result.error;

    const { user, businessRef, ref, register } = result;
    const name = String((await request.json()).name || '').trim();
    if (name.length < 2 || name.length > 30 || name.includes('/')) {
      return fail('El nombre debe tener entre 2 y 30 caracteres y no puede incluir / .');
    }

    const registers = await businessRef.collection('registers').get();
    const duplicate = registers.docs.some(document =>
      document.id !== ref.id && !document.data().archived &&
      document.data().name?.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (duplicate) return fail('Ya existe una caja con ese nombre.', 409);

    const sessions = await result.database.collection('cashSessions')
      .where('ownerId', '==', user.businessId)
      .get();
    const aliases = [...new Set([...(register.aliases || []), register.name])];
    const collidesWithHistory = sessions.docs.some(document => {
      const session = document.data();
      return session.registerName?.toLocaleLowerCase() === name.toLocaleLowerCase() &&
        !aliases.includes(session.registerName);
    });
    if (collidesWithHistory) return fail('Ya hay turnos históricos con ese nombre.', 409);

    const newRef = businessRef.collection('registers').doc(name);
    const nextRegister = { ...register, name, aliases, updatedAt: new Date().toISOString(), updatedBy: user.uid, archived: false };
    const batch = result.database.batch();
    batch.set(newRef, nextRegister);
    if (ref.id !== name) {
      batch.set(ref, { ...register, archived: true, renamedTo: name, updatedAt: nextRegister.updatedAt });
    }
    await batch.commit();

    return json({ register: { id: name, ...nextRegister } });
  } catch (error) {
    return safeError(error);
  }
}

export async function DELETE(_request, context) {
  try {
    const result = await getOwnerAndRegister(context);
    if (result.error) return result.error;

    const { user, database, ref, register } = result;
    const names = [...new Set([...(register.aliases || []), register.name])];
    const sessions = await database.collection('cashSessions')
      .where('ownerId', '==', user.businessId)
      .get();
    const hasOpenSession = sessions.docs.some(document => {
      const session = document.data();
      return names.includes(session.registerName) && session.status === 'open';
    });

    if (hasOpenSession) {
      return fail('Cerrá el turno abierto antes de eliminar esta caja.', 409);
    }

    await ref.set({
      ...register,
      name: register.name,
      archived: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user.uid,
    });

    return json({ success: true });
  } catch (error) {
    return safeError(error);
  }
}
