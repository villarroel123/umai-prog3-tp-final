/** @typedef {'buyer'|'owner'|'admin'} Role */
/** @typedef {{uid:string,email:string,name:string,role:Role,ownerStatus:'none'|'pending'|'approved',createdAt:string}} UserProfile */
/** @typedef {{id:string,name:string,description:string,category:string,price:number,unit:string,stock:number,ownerId:string,featured:boolean,createdAt:string,updatedAt:string}} Product */
/** @typedef {{productId:string,name:string,price:number,quantity:number,ownerId:string,unit:string}} OrderItem */
/** @typedef {{id:string,buyerId:string,buyerName:string,ownerId:string,items:OrderItem[],total:number,status:'placed'|'preparing'|'ready'|'delivered'|'cancelled',checkoutGroupId:string,createdAt:string}} Order */

export const CATEGORIES = ['Almacén', 'Frutas y verduras', 'Lácteos', 'Panadería', 'Bebidas', 'Limpieza'];
export const ORDER_STATUSES = ['placed', 'preparing', 'ready', 'delivered', 'cancelled'];
export const STATUS_LABELS = { placed: 'Recibido', preparing: 'Preparando', ready: 'Listo para retirar', delivered: 'Entregado', cancelled: 'Cancelado' };
export const money = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export const DEMO_PRODUCTS = [
  { id: 'demo-1', name: 'Palta Hass', description: 'Fresca y cremosa, seleccionada para tu mesa.', category: 'Frutas y verduras', price: 4200, unit: 'kg', stock: 22, ownerId: 'demo', featured: true, createdAt: '', updatedAt: '' },
  { id: 'demo-2', name: 'Tomate redondo', description: 'Tomates de estación, ideales para ensaladas.', category: 'Frutas y verduras', price: 2800, unit: 'kg', stock: 35, ownerId: 'demo', featured: true, createdAt: '', updatedAt: '' },
  { id: 'demo-3', name: 'Pan de masa madre', description: 'Corteza crujiente y miga suave.', category: 'Panadería', price: 6500, unit: 'unidad', stock: 12, ownerId: 'demo', featured: true, createdAt: '', updatedAt: '' },
  { id: 'demo-4', name: 'Leche entera', description: 'Leche fresca de primera calidad.', category: 'Lácteos', price: 2400, unit: 'litro', stock: 40, ownerId: 'demo', featured: false, createdAt: '', updatedAt: '' },
  { id: 'demo-5', name: 'Café molido', description: 'Tu ritual de todos los días.', category: 'Almacén', price: 9900, unit: '250 g', stock: 18, ownerId: 'demo', featured: false, createdAt: '', updatedAt: '' },
  { id: 'demo-6', name: 'Jugo de naranja', description: 'Sabor fresco para cualquier momento.', category: 'Bebidas', price: 3600, unit: 'litro', stock: 26, ownerId: 'demo', featured: false, createdAt: '', updatedAt: '' },
  { id: 'demo-7', name: 'Detergente cítrico', description: 'Limpieza práctica para tu cocina.', category: 'Limpieza', price: 3100, unit: '750 ml', stock: 16, ownerId: 'demo', featured: false, createdAt: '', updatedAt: '' },
  { id: 'demo-8', name: 'Queso cremoso', description: 'Suave y versátil para tus comidas.', category: 'Lácteos', price: 7900, unit: 'kg', stock: 10, ownerId: 'demo', featured: false, createdAt: '', updatedAt: '' }
];
