import { auth, db } from './firebase.mjs';
const email = process.argv[2];
if (!email) throw new Error('Uso: npm run make-admin -- correo@ejemplo.com');
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
await db.collection('users').doc(user.uid).set({ uid: user.uid, email: user.email || '', name: user.displayName || email.split('@')[0], role: 'admin', ownerStatus: 'none', createdAt: new Date().toISOString() }, { merge: true });
console.log(`Administrador asignado: ${email}. Cerrá sesión y volvé a ingresar para actualizar el token.`);
