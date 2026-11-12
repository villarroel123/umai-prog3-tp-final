# caja.

Sistema web de punto de venta para almacenes, kioscos y pequeños comercios. Permite administrar productos y stock, abrir y cerrar caja, cobrar y consultar ventas. Tarjeta y transferencia se registran manualmente; la aplicación no procesa dinero ni emite facturas fiscales.

## Tecnología

Next.js 16 (App Router), React 19, Firebase Authentication, Cloud Firestore y Firebase Admin SDK. Las rutas privadas verifican la cookie de sesión en el servidor. Las lecturas y escrituras de Firestore pasan por Route Handlers; `firestore.rules` niega acceso directo desde el navegador.

La interfaz usa blanco, negro y violeta como acento, tipografía Inter y el logo `caja.`. El panel tiene barra lateral en escritorio y menú en móvil.

## Roles y espacios

- **Administrador:** supervisa usuarios, productos y ventas de la plataforma en `/admin`.
- **Propietario:** administra un negocio en `/panel`. Una persona puede crear su negocio o aceptar una invitación para compartir otro. Varios propietarios del mismo negocio ven el mismo inventario, caja y ventas. Cada operación registra el UID de quien la realizó.
- Los clientes de una venta no tienen cuenta ni rol propio. En el cobro puede anotarse un nombre opcional; si se deja vacío, figura «Consumidor final».

El sitio público tiene inicio (`/`), acceso (`/login`) y registro (`/crear-cuenta`). No contiene ventas ni productos ficticios. El panel ofrece Resumen, Ventas, Clientes, Estadísticas y Configuración. Las rutas de caja, ventas, cierres y reportes siguen disponibles.

## Datos

| Colección | Contenido |
| --- | --- |
| `users/{uid}` | Perfil, rol y `businessId` del propietario. |
| `businesses/{businessId}` | Nombre editable, caja activa y siguiente número de ticket. El ID inicial es el UID de la primera persona propietaria. |
| `businesses/{businessId}/members/{uid}` | Propietarios activos del negocio. |
| `businessInvitations/{sha256(token)}` | Invitaciones por correo, con vencimiento de siete días y estado pendiente o aceptado. El token solo se entrega en el enlace al crearlo. |
| `products/{id}`, `categories/{id}` | Productos y categorías asociados al `businessId`. Los productos archivados se conservan para el historial y anulaciones. |
| `cashSessions/{id}`, `cashMovements/{id}` | Aperturas, cierres, ingresos y retiros de efectivo del negocio. |
| `sales/{checkoutId}`, `inventoryMovements/{id}` | Ventas, pagos, precios históricos y cambios de stock auditables. |

Por compatibilidad, el campo `ownerId` de productos, cajas y ventas contiene el ID del negocio. `cashierId` y `actorId` identifican a la persona que cobró o cambió stock.

El resumen calcula métricas únicamente con productos y ventas guardados. Si no hay operaciones, muestra cero y estados vacíos. Los ocho productos que antes eran plantillas compartidas se trasladaron al negocio «Mi negocio» de `sofiavillarroel15cib@gmail.com`; ya no existe la colección de plantillas. Sus imágenes WebP están en `public/assets/products`. Los precios y stocks provienen de las antiguas plantillas y deben revisarse contra la mercadería real antes de cobrar.

## Invitación de propietarios

En **Panel → Configuración**, cualquier propietario activo puede editar el nombre del negocio o crear una invitación para un correo. Copia el enlace y lo comparte por el canal que prefiera. La persona invitada ingresa con ese mismo correo y acepta en `/unirse`. El sistema no envía correos automáticamente. Una cuenta que ya posee otro negocio no puede unirse a uno distinto.

## Cobros

La caja busca por nombre o código de barras, arma un ticket, permite descuentos y recargos por artículo o venta, acepta efectivo, tarjeta, transferencia y pagos divididos, y calcula el vuelto. La transferencia exige confirmación manual. El servidor vuelve a validar precio y stock en Firestore y, en una transacción, crea la venta, descuenta stock, registra movimientos y actualiza la caja. `checkoutId` y `requestHash` evitan duplicados al reintentar. La anulación repone stock mientras la caja correspondiente sigue abierta. El comprobante imprimible está marcado como no fiscal.

## Configuración local

1. Ejecutá `npm install` y copiá `.env.example` a `.env.local`.
2. En Firebase Console, activá Authentication con **Email/Password** y **Google**. Agregá `localhost` y el dominio de producción a **Authorized domains**.
3. Creá Cloud Firestore. Publicá `firestore.rules` mediante `firebase deploy --only firestore:rules`.
4. Copiá la configuración de la app web a las variables `NEXT_PUBLIC_FIREBASE_*`. Generá una cuenta de servicio y guardá `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` solo en el servidor. No subas `.env.local`.
5. Ejecutá `npm run dev`, ingresá en `/login` y abrí `/panel`. Para promover una cuenta administradora existente: `npm run make-admin -- correo@ejemplo.com`; luego cerrá sesión y volvé a ingresar.

En Vercel, configurá las mismas variables en **Project Settings → Environment Variables**. La publicación todavía requiere una prueba manual completa de acceso y cobro.

## Verificación

`npm test` cubre validaciones, pagos, concurrencia, reintentos, stock, métricas y cobro por un segundo propietario del mismo negocio. `npm run build` verifica compilación y rutas. Sigue pendiente probar manualmente el acceso de Google y una venta con una cuenta real en el navegador.

## Uso de IA

Se utilizó Codex para implementar y documentar el proyecto. El código y las decisiones deben revisarse y comprenderse antes de la defensa.
