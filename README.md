# cesta.

**cesta. es un mercado online para quienes quieren comprar productos cotidianos de forma simple y para pequeños negocios que necesitan gestionar su catálogo y pedidos en un mismo lugar.**

Proyecto final de Programación III · UMAI. La aplicación usa Next.js App Router, Firebase Authentication y Cloud Firestore. El flujo principal es registrarse, agregar productos al carrito, confirmar una compra de prueba y ver el pedido persistido. Los propietarios pueden crear, editar, listar y eliminar productos. Un administrador aprueba a los propietarios y consulta la actividad general.

## Benchmark

| Producto | Problema y público | Funciones observadas | Qué toma cesta. | Diferencia de cesta. |
| --- | --- | --- | --- | --- |
| [Carrefour Argentina](https://www.carrefour.com.ar/como-comprar/) | Comprar supermercado online y revisar el pedido antes de finalizar. | Catálogo, carrito, cuenta, proceso de compra. | Flujo de catálogo a carrito y confirmación. | Interfaz más reducida y panel para negocios independientes. |
| [DIA Online](https://diaonline.supermercadosdia.com.ar/preguntas-frecuentes) | Compra de productos de supermercado con envío o retiro. | Categorías, compra online, opciones de entrega. | Categorías reconocibles y navegación rápida. | Una misma plataforma admite productos de distintos propietarios. |
| [Coto Digital](https://www.coto.com.ar/coto-digital/) | Compra de alimentos y artículos cotidianos a distancia. | Tienda online y organización de productos. | Amplitud del catálogo por rubros. | Menos promociones simultáneas y mayor foco en claridad visual. |

## Stack y decisiones

- **Next.js 16 + React 19 (JavaScript)**: App Router, rutas dinámicas y metadata por página. Las páginas y las validaciones iniciales de rutas privadas son Server Components; formularios, filtros, carrito y paneles son Client Components.
- **Firebase Authentication**: correo y contraseña, más Google. El navegador envía un ID token a `/api/session`; el servidor crea una cookie `httpOnly` verificada en cada ruta privada y escritura.
- **Cloud Firestore + Firebase Admin SDK**: los Route Handlers leen y escriben datos. Las reglas de Firestore niegan el acceso directo desde el navegador. La autorización de cada operación se valida en el servidor. Los pedidos se crean con una transacción que comprueba y descuenta stock.
- **CSS propio y lucide-react**: sistema visual responsive, con categorías, estados vacíos, carga y error. El catálogo ofrece búsqueda, filtros y ordenamiento.
- **Vercel**: destino previsto para el deploy de Next.js. Las credenciales aún deben configurarse en el proyecto de Firebase y Vercel.

### Modelo de datos

| Colección | Campos principales | Relación |
| --- | --- | --- |
| `users/{uid}` | `email`, `name`, `role`, `ownerStatus`, `createdAt` | `uid` es el UID de Authentication. El rol efectivo sale de custom claims. |
| `products/{id}` | `name`, `description`, `category`, `price`, `unit`, `stock`, `featured`, `ownerId`, fechas | `ownerId → users.uid`; solo propietario o admin modifican. |
| `orders/{id}` | `buyerId`, `buyerName`, `ownerId`, `items[]`, `total`, `status`, `checkoutGroupId`, `createdAt` | `buyerId → users.uid`; `ownerId → users.uid`. Una compra con varios propietarios genera un pedido por propietario. |

Los ítems del pedido guardan una copia de nombre, precio, unidad y cantidad para conservar el historial si cambia el producto. `checkoutGroupId` vincula los pedidos creados desde un mismo carrito. El comprador solo consulta sus pedidos; el propietario solo consulta los suyos.

### Roles

- **Comprador**: rol predeterminado al registrarse. Puede comprar, ver sus pedidos y solicitar acceso de propietario.
- **Propietario**: el administrador aprueba su solicitud y le asigna un custom claim. Puede gestionar sus productos y cambiar el estado de sus pedidos.
- **Administrador**: se asigna con `npm run make-admin`; puede ver usuarios y actividad, aprobar propietarios y gestionar productos. Nadie puede autoasignarse este rol desde la web.

### Mapa de navegación

```text
Inicio → Catálogo → Producto → Carrito → Login/registro → Mis pedidos
                         ↘ Mi cuenta → Solicitar acceso de propietario
Administrador → Aprobar negocio → Propietario → Productos (ABM) / Pedidos
```

## Instalación y conexión con Firebase

1. Ejecutá `npm install` y copiá `.env.example` como `.env.local`.
2. Creá un proyecto en [Firebase Console](https://console.firebase.google.com/). Agregá una aplicación web y copiá `apiKey`, `authDomain`, `projectId` y `appId` en las variables `NEXT_PUBLIC_*`.
3. En **Authentication → Sign-in method**, activá **Email/Password** y **Google**. Agregá el dominio de Vercel a los dominios autorizados cuando publiques.
4. Creá **Cloud Firestore**. Publicá las reglas de `firestore.rules` con Firebase CLI (`firebase deploy --only firestore:rules`) o copiándolas en la consola.
5. En **Project settings → Service accounts**, generá una clave privada. Copiá `project_id`, `client_email` y `private_key` a `FIREBASE_*` en `.env.local`. Para la clave privada, conservá los saltos de línea como `\n` dentro de comillas. Nunca la subas a Git.
6. Ejecutá `npm run dev`. Registrá una cuenta desde `/login`.
7. Para crear el primer administrador: `npm run make-admin -- tu-correo@ejemplo.com`. Cerrá sesión y volvé a ingresar.
8. Para cargar productos de prueba, registrá otra cuenta y ejecutá `npm run seed -- correo-del-propietario@ejemplo.com`. Cerrá sesión y volvé a ingresar con esa cuenta. El seed crea ocho productos y **duplica los datos si se vuelve a ejecutar**.

Sin variables de entorno, el catálogo muestra productos de muestra para revisar el diseño; login, pedidos y ABM requieren Firebase configurado.

### Variables

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Configuración pública del SDK web. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de Authentication. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID público del proyecto. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ID de la aplicación web. |
| `FIREBASE_PROJECT_ID` | Proyecto del Admin SDK. |
| `FIREBASE_CLIENT_EMAIL` | Cuenta de servicio del Admin SDK. |
| `FIREBASE_PRIVATE_KEY` | Clave privada de la cuenta de servicio. Solo servidor. |

Para Vercel, copiá estas siete variables en **Project Settings → Environment Variables** y ejecutá el deploy. El repositorio no incluye claves ni usuarios de prueba reales. Antes de entregar, creá un comprador, un propietario y un administrador de prueba y anotá credenciales temporales de corrección por un canal privado; no pongas contraseñas en este README.

## Requisitos y estado

Implementado: ABM de productos, tres roles, búsqueda/filtros/orden, carrito, compra de prueba, historial, rutas privadas, transacciones de stock, estados de carga/error/vacío, metadata y diseño responsive. Pendiente de credenciales del proyecto: probar la integración real de Firebase, cargar datos remotos, crear usuarios de prueba y publicar en Vercel. También faltan capturas de pantalla del deploy final.

## Uso de IA

**Consentimiento:** se utilizó Codex para generar la estructura inicial, componentes, estilos, modelo de datos, Route Handlers y documentación. Se utilizó ImageGen para crear la fotografía de la bolsa de compras del hero, tomando la captura aportada como referencia de composición. El código y los recursos deben revisarse y comprenderse antes de la defensa.

**Reflexión inicial:** la IA permitió convertir la consigna en un flujo funcional y coherente con rapidez. Se revisaron especialmente la separación de roles, el aislamiento de datos entre usuarios y la actualización de stock. Tras conectar Firebase, corresponde verificar esos flujos en un entorno real y registrar qué cambios fueron necesarios y qué se aprendió para completar esta reflexión con experiencia propia.
