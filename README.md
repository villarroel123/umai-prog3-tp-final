# ZETA

Sistema web de punto de venta para almacenes, kioscos y pequeños comercios. Permite administrar productos y stock, abrir y cerrar caja, cobrar y consultar ventas. Tarjeta y transferencia se registran manualmente; la aplicación no procesa dinero ni emite facturas fiscales.

## Tecnología

Next.js 16 (App Router), React 19, Firebase Authentication, Cloud Firestore y Firebase Admin SDK. Las rutas privadas verifican la cookie de sesión en el servidor. Las lecturas y escrituras de Firestore pasan por Route Handlers; `firestore.rules` niega acceso directo desde el navegador.

La interfaz usa blanco, negro y violeta como acento, tipografía Inter y el logo ZETA. El panel tiene barra lateral en escritorio y menú en móvil.

## Roles y espacios

- **Administrador:** supervisa usuarios, productos y ventas de la plataforma en `/admin`.
- **Propietario:** administra un negocio en `/panel`. Una persona puede crear su negocio o aceptar una invitación para compartir otro. Varios propietarios del mismo negocio ven el mismo inventario, caja y ventas. Cada operación registra el UID de quien la realizó.
- **Cajero:** ingresa con código de negocio, usuario y contraseña en `/login`. El propietario lo crea desde **Negocio → Cajas → Cajeros**. Solo puede cobrar y consultar productos o stock según sus permisos. No ve costos, reportes ni configuración.
- Los clientes de una venta no tienen cuenta ni rol propio. En el cobro puede anotarse un nombre opcional; si se deja vacío, figura «Consumidor final».

El sitio público tiene inicio (`/`), acceso (`/login`) y registro (`/crear-cuenta`). No contiene ventas ni productos ficticios. El panel ofrece Resumen, Ventas, Clientes, Estadísticas y Configuración. Las rutas de caja, ventas, cierres y reportes siguen disponibles.

## Datos

| Colección | Contenido |
| --- | --- |
| `users/{uid}` | Perfil, rol y `businessId` del propietario o cajero. |
| `businesses/{businessId}` | Nombre editable, caja activa y siguiente número de ticket. El ID inicial es el UID de la primera persona propietaria. |
| `businesses/{businessId}/members/{uid}` | Membresía y estado de propietarios y cajeros del negocio. |
| `businesses/{businessId}/cashiers/{uid}` | Cajero, usuario, caja asignada, permisos, estado y fechas. No guarda contraseñas. |
| `businesses/{businessId}/cashierUsernames/{username}` | Reserva transaccional del nombre de usuario dentro del negocio. |
| `businesses/{businessId}/registers/{id}` | Cajas físicas o virtuales. Su identidad es distinta del UID del cajero. |
| `businessInvitations/{sha256(token)}` | Invitaciones por correo, con vencimiento de siete días y estado pendiente o aceptado. El token solo se entrega en el enlace al crearlo. |
| `products/{id}`, `categories/{id}` | Productos y categorías asociados al `businessId`. Los productos archivados se conservan para el historial y anulaciones. |
| `cashSessions/{id}`, `cashMovements/{id}` | Aperturas, cierres, ingresos y retiros de efectivo del negocio. |
| `sales/{checkoutId}`, `inventoryMovements/{id}` | Ventas, pagos, precios históricos y cambios de stock auditables. |
| `saleReturns/{returnId}` | Devoluciones parciales o completas, reintegros y autorización del propietario. |

Por compatibilidad, el campo `ownerId` de productos, cajas y ventas contiene el ID del negocio. `cashierId` y `actorId` identifican a la persona que cobró o cambió stock.

Las ventas nuevas también guardan `businessId`, `registerId` y `turnId`. La identidad del cajero se obtiene de la sesión del servidor; el navegador no puede elegirla en el cobro. El nombre histórico queda en la venta aunque se desactive su cuenta.

El resumen calcula métricas únicamente con productos y ventas guardados. Si no hay operaciones, muestra cero y estados vacíos. Los ocho productos que antes eran plantillas compartidas se trasladaron al negocio «Mi negocio» de `sofiavillarroel15cib@gmail.com`; ya no existe la colección de plantillas. Sus imágenes WebP están en `public/assets/products`. Los precios y stocks provienen de las antiguas plantillas y deben revisarse contra la mercadería real antes de cobrar.

## Invitación de propietarios

En **Panel → Configuración**, cualquier propietario activo puede editar el nombre del negocio o crear una invitación para un correo. Copia el enlace y lo comparte por el canal que prefiera. La persona invitada ingresa con ese mismo correo y acepta en `/unirse`. El sistema no envía correos automáticamente. Una cuenta que ya posee otro negocio no puede unirse a uno distinto.

## Cobros

La caja busca por nombre, código interno o código de barras; también admite `3xCODIGO` para cargar varias unidades con una lectura. Arma un ticket, permite descuentos y recargos por artículo o venta, acepta efectivo, tarjeta, transferencia y pagos divididos, y calcula el vuelto. La transferencia exige confirmación manual. El servidor vuelve a validar precio y stock en Firestore y, en una transacción, crea la venta, descuenta stock, registra movimientos y actualiza la caja. `checkoutId` y `requestHash` evitan duplicados al reintentar. La anulación repone stock mientras la caja correspondiente sigue abierta. Las devoluciones F2/F3 reponen stock y registran el reintegro en la caja abierta, incluso si la venta original fue en un turno anterior. El comprobante imprimible está marcado como no fiscal.

## Cajeros

El propietario crea una cuenta con nombre, usuario, clave temporal y caja asignada. El código del negocio se muestra en la pestaña **Cajeros**. Cada usuario es único dentro del negocio y puede repetirse en otro. El empleado entra en **Acceder → Cajero**, usa el código, su usuario y su clave, y debe cambiarla antes de operar. La clave reside en Firebase Authentication, no en Firestore. La identidad interna de Firebase se genera en el servidor y no se muestra al empleado. El propietario puede cambiar la asignación, permisos, estado y restablecer la clave. Desactivar una cuenta también la deshabilita en Authentication y revoca sus sesiones. Los turnos existentes usan una caja abierta por negocio; por eso un cajero asignado a otra caja deberá esperar el cierre de la caja activa. El permiso opcional de caja permite al cajero asignado abrir, cerrar y registrar movimientos solo en su propia caja. Los permisos de ajustes y devoluciones se otorgan por separado y cada operación guarda el UID de quien actuó y de quien la autorizó. El cajero usa `/caja` a pantalla completa; el propietario puede abrir el mismo diseño desde **Pantalla de cajero** en su caja.

## Configuración local

1. Ejecutá `npm install` y copiá `.env.example` a `.env.local`.
2. En Firebase Console, activá Authentication con **Email/Password** y **Google**. Agregá `localhost` y el dominio de producción a **Authorized domains**.
3. Creá Cloud Firestore. Publicá `firestore.rules` mediante `firebase deploy --only firestore:rules`.
4. Copiá la configuración de la app web a las variables `NEXT_PUBLIC_FIREBASE_*`. Generá una cuenta de servicio y guardá `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` solo en el servidor. No subas `.env.local`.
   Para las cuentas de cajeros, definí también `CASHIER_LOGIN_SECRET` con un valor aleatorio largo y mantené exactamente el mismo valor en todos los entornos. Si lo cambiás después de crear cajeros, sus usuarios dejarán de coincidir con las identidades internas. Mientras esté vacío, se usa `FIREBASE_PRIVATE_KEY` como clave de derivación.
5. Ejecutá `npm run dev`, ingresá en `/login` y abrí `/panel`. Para promover una cuenta administradora existente: `npm run make-admin -- correo@ejemplo.com`; luego cerrá sesión y volvé a ingresar.

En Vercel, configurá las mismas variables en **Project Settings → Environment Variables**. La publicación todavía requiere una prueba manual completa de acceso y cobro.

## Verificación

`npm test` cubre validaciones, pagos, concurrencia, reintentos, stock, métricas y permisos de un cajero al cobrar. `npm run build` verifica compilación y rutas. El flujo completo de alta, acceso, cambio de clave y cobro con cuentas reales requiere una prueba manual en Firebase; estas pruebas automatizadas no crean empleados ni ventas reales.

## Caja, atajos e impresion ESC/POS

La caja operativa vive en `/caja` y conserva inventario, autenticación, pago mixto y guardado transaccional. La interfaz está en `src/components/CashierPosView.jsx` y el estado compartido en `src/components/PosWorkspace.jsx`. F1 elimina un producto; F2 y F3 registran devoluciones autorizadas de una venta anterior; F4 aplica descuentos, recargos o un precio puntual autorizado; F9 vuelve al buscador y F10 lleva al pago.

Las devoluciones parciales de ventas cobradas se registran desde la caja o desde `/ventas/{id}`. Ambas entradas usan la misma transacción y guardan el reintegro en `saleReturns`; reponen stock y se descuentan del cierre Z. El cierre se guarda en `cashSessions` antes de imprimirlo.

`src/lib/impresora.js` concentra interfaz, tipo, ancho de 48 columnas, apertura del cajon y timeout. `src/lib/impresion.js` genera tickets ESC/POS. Las rutas estan en `src/app/api/print/` y usan `runtime = 'nodejs'`. Los fallos se guardan aparte en `printJobs`, sin borrar ventas ni cierres.

1. Ejecuta `npm install` para instalar `node-thermal-printer` (licencia ISC; no requiere servicios pagos).
2. En `.env.local`, configura `IMPRESORA_INTERFACE=//localhost/TICKETS` para una impresora USB compartida en Windows, o `IMPRESORA_INTERFACE=tcp://192.168.1.50:9100` para una impresora de red. Cambia la IP por la de tu impresora. Configura `IMPRESORA_TIPO=epson`, `star`, `tanca`, `daruma`, `brother` o `custom` segun el modelo.
3. En Windows instala el driver del fabricante, imprime una pagina de prueba desde Preferencias de impresion y comparte la impresora con el nombre `TICKETS`. Next.js debe ejecutarse en la misma PC con una cuenta de Windows que pueda imprimir en esa cola. Para red, verifica la IP y el puerto ESC/POS (normalmente 9100).
4. Reinicia `npm run dev`, ingresa como propietario y abre **Cierres de caja** (`/cierres`). Pulsa **Probar impresora**; deberias recibir un ticket corto. La prueba no abre el cajon.
5. Para probar el cobro real, abre una caja, agrega un producto, presiona F10, completa y confirma el pago. La venta se guarda antes de imprimir. Si falla la impresora, aparece el error y **Reimprimir ticket** vuelve a enviar el mismo comprobante. Al cerrar una caja se imprime el cierre Z, que tambien se puede reimprimir desde **Cierres de caja**.

El firmware de cada impresora puede variar en acentos y comandos ESC/POS. Usa rollo de 80 mm; el ancho esta configurado en 48 columnas.

Este proyecto usa JavaScript y CSS propios en lugar de TypeScript y Tailwind porque esa es la base que ya tiene el repositorio; no se migro el resto de la aplicacion.

## Uso de IA

Se utilizó Codex para implementar y documentar el proyecto. El código y las decisiones deben revisarse y comprenderse antes de la defensa.
