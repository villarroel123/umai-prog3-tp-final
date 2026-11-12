import { db } from '@/lib/firebase-admin';
import { sessionUser } from '@/lib/session';
import { fail, json, safeError } from '@/lib/api';

function latestSessionsByRegister(sessions) {
  const grouped = new Map();

  for (const session of sessions) {
    const history = grouped.get(session.registerName) || [];
    history.push(session);
    grouped.set(session.registerName, history);
  }

  for (const history of grouped.values()) {
    history.sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }

  return grouped;
}

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'business_owner') {
      return fail('Iniciá sesión como propietario.', 403);
    }

    const database = db();
    const businessRef = database.collection('businesses').doc(user.businessId);
    const [registerSnapshot, sessionSnapshot, memberSnapshot] = await Promise.all([
      businessRef.collection('registers').get(),
      database.collection('cashSessions')
        .where('ownerId', '==', user.businessId)
        .get(),
      businessRef.collection('members').get(),
    ]);

    const members = new Map(
      memberSnapshot.docs.map(document => [document.id, document.data()]),
    );
    const sessions = sessionSnapshot.docs.map(document => ({
      id: document.id,
      ...document.data(),
    }));
    const historyByRegister = latestSessionsByRegister(sessions);
    const archivedNames = new Set(
      registerSnapshot.docs
        .filter(document => document.data().archived)
        .map(document => document.data().name),
    );
    const registers = new Map(
      registerSnapshot.docs
        .filter(document => !document.data().archived)
        .map(document => [document.id, { id: document.id, ...document.data() }]),
    );

    // Include cajas que ya existían como turnos antes de guardar su configuración.
    for (const session of sessions) {
      if (!registers.has(session.registerName) && !archivedNames.has(session.registerName)) {
        registers.set(session.registerName, {
          id: session.registerName,
          name: session.registerName,
          createdAt: session.openedAt,
        });
      }
    }

    const result = [...registers.values()].map(register => {
      const history = [...(register.aliases || []), register.name]
        .flatMap(name => historyByRegister.get(name) || [])
        .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
      const latest = history[0];

      return {
        ...register,
        sessionCount: history.length,
        latestSession: latest
          ? {
              status: latest.status,
              openedAt: latest.openedAt,
              closedAt: latest.closedAt || null,
              cashier: members.get(latest.openedBy)?.name || latest.openedBy,
              salesCount: latest.salesCount || 0,
              grossTotal: latest.grossTotal || 0,
            }
          : null,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return json({ registers: result });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request) {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'business_owner') {
      return fail('Iniciá sesión como propietario.', 403);
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (name.length < 2 || name.length > 30 || name.includes('/')) {
      return fail('El nombre debe tener entre 2 y 30 caracteres y no puede incluir / .');
    }

    const registersRef = db()
      .collection('businesses')
      .doc(user.businessId)
      .collection('registers');
    const existing = await registersRef.get();
    const duplicate = existing.docs.some(document =>
      !document.data().archived && document.data().name?.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );

    if (duplicate) {
      return fail('Ya existe una caja con ese nombre.', 409);
    }

    const register = {
      name,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    };
    await registersRef.doc(name).set(register);

    return json({ register: { id: name, ...register } }, 201);
  } catch (error) {
    return safeError(error);
  }
}
