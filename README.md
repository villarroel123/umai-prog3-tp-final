# caja.

**caja. es un sistema web de cobros para pequeños negocios que necesitan cargar productos, registrar ventas y consultar comprobantes con una interfaz clara.**

Proyecto final de Programación III · UMAI. El propietario abre la caja, busca o escanea productos, arma el ticket, registra uno o varios medios de pago y cierra la jornada. El sistema registra esos cobros, pero no procesa dinero con una pasarela. El comprador puede consultar los comprobantes asociados a su cuenta. El administrador gestiona los accesos de propietarios y supervisa la actividad.

## Benchmark

| Referencia | Problema y público | Funciones observadas | Qué toma caja. | Diferencia de caja. |
| --- | --- | --- | --- | --- |
| [Loyverse TPV](https://loyverse.com/es/features) | Punto de venta para pequeños comercios. | Artículos, lector de códigos, recibos, medios de pago e inventario. | Flujo de artículo → ticket → pago → recibo. | Versión web de alcance acotado, con una caja visible y tres roles. |
| [Loyverse: cierre de turnos](https://help.loyverse.com/es/help/shift-management-loyverse-pos) | Control del efectivo al iniciar y terminar un turno. | Apertura, efectivo esperado y cierre. | Fondo inicial, cobros en efectivo y diferencia final. | Resumen directo en la misma pantalla de caja. |
| [Mercado Pago: locales y cajas](https://vendedores.mercadolibre.com.ar/nota/locales-una-herramienta-para-mejorar-la-gestion-de-tus-puntos-de-venta?guideKeyId=GE27) | Organizar cobros de un negocio por punto de venta. | Local, nombre de caja y consulta de cobros. | Identificación de caja e historial. | La app registra tarjeta y transferencia manualmente; no se conecta a terminales ni procesa dinero. |

La foto y las capturas del POS aportadas para este proyecto orientaron la estructura del flujo: **nota de venta para consumidor final, búsqueda por código o nombre, renglones con precio y cantidad, cobro con varios medios, importe recibido, vuelto y comprobante**. La interfaz actual usa una composición limpia y responsive, sin reproducir la estética antigua del equipo fotografiado.

## Tecnologías y decisiones

- **Next.js 16 y React 19, JavaScript, App Router.** Las páginas privadas verifican la sesión en el servidor. La caja y los formularios son Client Components porque necesitan interacción inmediata.
- **Firebase Authentication.** Correo y contraseña más Google. El ID token se canjea por una cookie de sesión `httpOnly`; los roles se verifican con custom claims.
- **Cloud Firestore y Firebase Admin SDK.** Los Route Handlers controlan las lecturas y escrituras. `firestore.rules` niega acceso directo desde el navegador.
- **Transacción de venta.** El servidor toma los precios de Firestore, comprueba stock y caja abierta, asigna número de comprobante, guarda la venta y descuenta stock en una sola transacción. `checkoutId` permite reintentar sin duplicar una operación.
- **CSS propio y lucide-react.** Interfaz responsive con foco visible, estados vacíos, carga y error. La pantalla de caja admite lectores que escriben el código y envían Enter.
- **Vercel.** Destino previsto para el deploy. Todavía faltan credenciales propias del proyecto y publicación.

### Panel del negocio · primera etapa

El sitio público conserva `/` (demostración), `/login` (acceso) y ahora tiene `/crear-cuenta` (registro). El panel privado del propietario usa el layout reutilizable de `/panel`, con barra lateral fija en escritorio y menú desplegable en móvil:

| Ruta | Estado |
| --- | --- |
| `/panel` | Resumen con ventas de hoy, ticket promedio, stock bajo, gráfico de siete días, productos más vendidos y actividad reciente. |
| `/panel/nueva-venta` | Reutiliza la caja existente sin cambiar el flujo de cobro. |
| `/panel/productos` | Reutiliza la gestión de productos. `?nuevo=1` abre el formulario de alta. |
| `/panel/ventas` | Reutiliza el historial y el detalle de venta. |
| `/panel/clientes`, `/panel/estadisticas`, `/panel/configuracion` | Estados vacíos preparados para etapas posteriores. |

El resumen usa las APIs actuales de ventas y productos. Si un negocio todavía no tiene ninguno de esos datos, muestra una **vista de demostración** rotulada; no guarda esos ejemplos ni los presenta como operaciones reales. Si hay datos persistidos, calcula las cifras solo con ellos y excluye las ventas anuladas de los totales. Las rutas previas (`/caja`, `/propietario`, `/ventas`, entre otras) continúan disponibles.

### Identidad visual

La interfaz usa una base blanca y negra, grises claros y violeta como color de acento, con tipografía Inter. El logo original representa una caja registradora con un punto violeta que acompaña el nombre `caja.`. El símbolo está en `public/caja-mark.svg` y se reutiliza como ícono de la aplicación en `src/app/icon.svg`. El tema se centraliza en `src/app/theme.css`; la navegación del panel y las pantallas existentes conservan sus funciones.

### Modelo de datos

| Colección | Campos principales | Relación y acceso |
| --- | --- | --- |
| `catalogTemplates/{code}` | `code`, `name`, `category`, `unit`, `price`, `stock`, `imageUrl`, `updatedAt` | Catálogo compartido de ejemplo. Sus imágenes están en `public/assets/products` y sus precios y existencias son demostrativos. |
| `users/{uid}` | `email`, `name`, `role`, `ownerStatus`, `createdAt` | `uid` viene de Firebase Auth. El rol efectivo sale de custom claims. |
| `products/{id}` | `ownerId`, `code`, `name`, `category`, `unit`, `price`, `stock`, `imageUrl`, `isSample`, `archivedAt`, fechas | Cada producto pertenece a un propietario. Los archivados no aparecen en caja; se conservan para reponer stock ante una anulación. |
| `businesses/{ownerId}` | `name`, `activeSessionId`, `nextReceiptNumber` | Nombre del negocio, caja activa y numeración de ventas por propietario. |
| `cashSessions/{id}` | `ownerId`, `businessName`, `registerName`, `openingAmount`, `cashSalesTotal`, `cashAdjustmentsTotal`, `grossTotal`, `salesCount`, `voidCount`, `status`, `closingAmount`, `expectedClosingAmount`, `difference`, fechas | Un propietario puede tener una sesión de caja activa. |
| `cashMovements/{id}` | `ownerId`, `cashSessionId`, `type`, `amount`, `note`, `createdAt` | Ingresos y retiros ajenos a ventas, incluidos en el efectivo esperado del turno. |
| `sales/{checkoutId}` | `ownerId`, `businessId`, `cashierId`, `buyerId`, `cashSessionId`, `receiptNumber`, `items[]`, `adjustment`, `saleAdjustmentAmount`, `total`, `payments[]`, `amountReceived`, `change`, `requestHash`, `status`, fechas | Precios históricos y pagos quedan guardados en la venta. La clave de cobro evita duplicados. |
| `inventoryMovements/{id}` | `ownerId`, `businessId`, `saleId`, `productId`, `previousStock`, `newStock`, `delta`, `reason`, `actorId`, `createdAt` | Registra ventas, anulaciones y ajustes manuales junto al cambio de stock. |

Los ítems de venta guardan copias del código, nombre, precio y ajuste al momento del cobro. `payments[]` permite dividir una venta entre hasta cinco renglones de efectivo, tarjeta y transferencia; la suma debe coincidir con el total. El comprador se busca por nombre o correo y se selecciona antes de cobrar; si se omite, la venta queda para “Consumidor final”. Los descuentos y recargos pueden aplicarse por producto y al total de la venta; el servidor calcula nuevamente el importe con los precios de Firestore. Se puede anular una venta mientras su caja sigue abierta: el motivo queda registrado, se restituye el stock y se ajustan los totales. Si hubo un pago externo, su devolución se gestiona por separado. No hay facturación fiscal, conciliación bancaria ni cobro real con tarjeta o transferencia.

Las ocho imágenes de ejemplo son archivos WebP locales en `public/assets/products`; Firestore guarda solo su ruta `imageUrl`, no los archivos. `npm run sync-catalog` crea o actualiza las ocho plantillas compartidas. Un propietario aprobado puede pulsar **Importar ejemplos** en Productos: se copian a `products` con su `ownerId` y `isSample: true`, sin duplicar códigos. Conviene revisar precios y stock antes de una venta. El administrador gestiona roles mediante custom claims, el propietario administra solo sus productos y el comprador consulta sus comprobantes; no se crean cuentas ni ventas ficticias. Firestore crea `users`, `businesses`, `products` y las colecciones operativas cuando se guarda el primer documento real de cada tipo.

### Roles y navegación

```text
Inicio (demo interactiva) → Login / registro
  Comprador → Mi cuenta → Mis comprobantes → Detalle imprimible
  Comprador → Solicitar acceso de propietario → Aprobación del admin
  Propietario → /panel → Resumen → Nueva venta (caja existente)
                              ↘ Productos (ABM) / Ventas (historial)
                              ↘ Clientes / Estadísticas / Configuración (próximas etapas)
  Caja existente → Apertura / movimientos / cierre → Historial de cierres
  Reportes existentes → Filtros → CSV
  Administrador → Usuarios y roles → Actividad general → Ventas → Reportes
```

La vista de muestra del inicio funciona sin Firebase y no guarda datos. Las rutas `/caja`, `/propietario`, `/ventas`, `/cierres`, `/reportes`, `/comprobantes`, `/cuenta` y `/admin` requieren sesión y autorización según el rol.

## Paso 2 · Productos e inventario

`/panel/productos` muestra productos activos y archivados, métricas de stock, valor calculado solo con los artículos que tienen costo de compra, búsqueda, filtros y ordenamiento. El propietario puede crear o editar productos, elegir una de las imágenes locales, archivar y restaurar, y administrar categorías personalizadas. Un ajuste manual de stock exige un motivo y guarda en `inventoryMovements` la cantidad anterior, la nueva, la diferencia, el autor y la fecha en la misma transacción que actualiza el producto.

Los documentos de `products` conservan `ownerId`, `code`, `price` y `category` para las rutas de venta existentes y agregan `businessId`, `barcode`, `categoryId`, `description`, `salePrice`, `costPrice`, `minStock`, `imageUrl` e `isActive`. Los documentos antiguos se normalizan al leerlos. `categories` pertenece a cada propietario; las categorías iniciales se ofrecen desde la aplicación y se crean documentos solo para las personalizadas. El navegador no accede a Firestore directamente: las nuevas rutas verifican sesión y propietario. La caja obtiene los productos activos del mismo endpoint y ahora tiene catálogo y ticket con desplazamiento independiente en escritorio, ajustes de ítem desplegables y el total y la acción de cobro accesibles.

La demo pública mantiene productos de muestra y cobro sin persistencia. La cantidad de stock se maneja por enteros, incluso si la unidad elegida es kilogramo o litro. La selección de imagen usa los archivos locales actuales; la carga de imágenes nuevas requerirá almacenamiento en una etapa posterior.

## Paso 3 · Ventas y cobros

La caja privada vuelve a leer precios, estado y stock de Firestore antes de confirmar. En una sola transacción guarda la venta, resta unidades, crea movimientos de inventario, actualiza los totales de la caja y avanza el contador de tickets del negocio. La clave `checkoutId` y la huella `requestHash` hacen seguros los reintentos: repetir el mismo pedido devuelve la venta existente; reutilizar la clave con otro contenido se rechaza. La demo de `/` solo modifica su estado en memoria.

Se registran efectivo, tarjeta, transferencia y pagos divididos. El efectivo exige un importe recibido suficiente y calcula el vuelto sobre su porción. Tarjeta y transferencia admiten referencia opcional; la transferencia exige que el comerciante confirme manualmente su recepción. Ninguno de esos métodos procesa un pago externo. El ticket se limpia solo cuando el servidor confirma el guardado; si falla la red, queda disponible para reintentar.

`/panel/ventas` permite buscar tickets y filtrar por fecha, medio y estado; el resumen y el Dashboard leen ventas persistidas. El detalle incluye operador, precios históricos y pagos, y ofrece una impresión compacta marcada **comprobante no fiscal**. Los movimientos de anulación también quedan asociados a la venta. Las 20 pruebas automatizadas cubren validaciones, pagos, concurrencia sobre la última unidad, reintentos, fallo antes del commit y métricas; falta una prueba manual de venta real con una cuenta propietaria y datos del negocio.

## Instalación y conexión con Firebase

1. Ejecutá `npm install` y copiá `.env.example` como `.env.local`.
2. Creá un proyecto en [Firebase Console](https://console.firebase.google.com/). Agregá una aplicación web y copiá `apiKey`, `authDomain`, `projectId` y `appId` a las variables `NEXT_PUBLIC_*`.
3. En **Authentication → Sign-in method**, activá **Email/Password** y **Google**. Para el deploy, agregá el dominio de Vercel a los dominios autorizados.
4. Creá **Cloud Firestore** y publicá `firestore.rules` con Firebase CLI (`firebase deploy --only firestore:rules`) o copiando su contenido en la consola.
5. En **Project settings → Service accounts**, generá una clave privada y copiá `project_id`, `client_email` y `private_key` a `FIREBASE_*` en `.env.local`. Conservá los saltos de línea de la clave como `\n` dentro de comillas. Nunca la subas al repositorio.
6. Ejecutá `npm run dev`. Registrá una cuenta compradora en `/login`.
7. Convertí una cuenta en administrador con `npm run make-admin -- tu-correo@ejemplo.com`. Cerrá sesión y volvé a ingresar.
8. Registrá otra cuenta y solicitá acceso de propietario desde `/cuenta`; aprobala desde `/admin`. También podés cargar ocho productos de prueba y asignar el rol con `npm run seed -- correo-del-propietario@ejemplo.com`. El seed omite productos que ya creó antes.
9. Como propietario, cargá productos, abrí `/caja`, ingresá el fondo inicial y hacé una venta. Para que el comprador vea el comprobante, escribí su correo registrado antes de confirmar. Verificá `/ventas` y `/comprobantes` con cada cuenta.

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Configuración pública del SDK web. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de Authentication. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID público del proyecto. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ID de la aplicación web. |
| `FIREBASE_PROJECT_ID` | Proyecto del Admin SDK. |
| `FIREBASE_CLIENT_EMAIL` | Cuenta de servicio del Admin SDK. |
| `FIREBASE_PRIVATE_KEY` | Clave privada de la cuenta de servicio, solo en el servidor. |

En Vercel, copiá estas siete variables en **Project Settings → Environment Variables**. El repositorio no contiene credenciales ni usuarios reales. Para la corrección, creá un comprador, propietario y administrador de prueba y compartí las credenciales por un canal privado. Si venís de la versión anterior de ecommerce, usá una base nueva o migrá los documentos viejos: `orders` y los productos sin `code` no forman parte del sistema de cobros.

## Funcionalidad y estado

Implementado: ABM de productos, tres roles, búsqueda y filtro, apertura/cierre de caja, movimientos de efectivo, registro manual de pagos simples o combinados, vuelto, descuentos y recargos, descuento y restitución de stock, anulación auditada, búsqueda de compradores, número de comprobante, historial por rol, historial de cierres, reportes con filtros y CSV, vista imprimible, rutas privadas, estados de carga/error/vacío y diseño responsive. Firebase está configurado en el entorno local; cada despliegue necesita sus propias variables. Falta verificar una venta completa con una cuenta propietaria y productos reales, además del despliegue y sus capturas.

## Uso de IA

**Consentimiento:** se utilizó Codex para generar la estructura, pantallas, estilos, modelos, Route Handlers y esta documentación. El código debe revisarse y comprenderse antes de la defensa.

**Reflexión inicial:** la IA ayudó a reorganizar un ecommerce en un flujo de punto de venta y a plantear validaciones de stock, roles y caja. Al conectar Firebase corresponde ejecutar el flujo con los tres usuarios, revisar la persistencia y documentar qué ajustes fueron necesarios y qué se aprendió; esta reflexión debe completarse con la experiencia propia de la demo.
