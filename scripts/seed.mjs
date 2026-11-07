import { auth, db } from './firebase.mjs';
const email = process.argv[2];
if (!email) throw new Error('Uso: npm run seed -- correo-del-propietario@ejemplo.com');
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), owner: true });
await db.collection('users').doc(user.uid).set({ uid: user.uid, email: user.email || '', name: user.displayName || email.split('@')[0], role: 'owner', ownerStatus: 'approved', createdAt: new Date().toISOString() }, { merge: true });
const products = [
  ['Palta Hass','Fresca y cremosa, seleccionada para tu mesa.','Frutas y verduras',4200,'kg',22,true],
  ['Tomate redondo','Tomates de estación, ideales para ensaladas.','Frutas y verduras',2800,'kg',35,true],
  ['Pan de masa madre','Corteza crujiente y miga suave.','Panadería',6500,'unidad',12,true],
  ['Leche entera','Leche fresca de primera calidad.','Lácteos',2400,'litro',40,false],
  ['Café molido','Tu ritual de todos los días.','Almacén',9900,'250 g',18,false],
  ['Jugo de naranja','Sabor fresco para cualquier momento.','Bebidas',3600,'litro',26,false],
  ['Detergente cítrico','Limpieza práctica para tu cocina.','Limpieza',3100,'750 ml',16,false],
  ['Queso cremoso','Suave y versátil para tus comidas.','Lácteos',7900,'kg',10,false]
];
const now = new Date().toISOString();
const batch = db.batch();
for (const [name,description,category,price,unit,stock,featured] of products) {
  const ref = db.collection('products').doc();
  batch.set(ref, { name,description,category,price,unit,stock,featured,ownerId:user.uid,createdAt:now,updatedAt:now });
}
await batch.commit();
console.log(`${products.length} productos creados para ${email}. No vuelvas a ejecutar este comando si no querés duplicarlos.`);
