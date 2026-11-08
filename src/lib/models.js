/** @typedef {'owner'|'admin'} Role */
/** @typedef {{uid:string,email:string,name:string,role:Role,businessId:string|null,createdAt:string}} UserProfile */
/** @typedef {{id:string,businessId:string,ownerId:string,name:string,barcode:string,code:string,categoryId:string,category:string,description:string,salePrice:number,price:number,costPrice:number|null,stock:number,minStock:number,unit:'unidad'|'kilogramo'|'litro',imageUrl:string,isActive:boolean,createdAt:string,updatedAt:string}} Product */
/** @typedef {{id:string,ownerId:string,businessId:string,name:string,isDefault?:boolean,createdAt:string,updatedAt:string}} Category */
/** @typedef {{id:string,ownerId:string,businessId:string,productId:string,productName:string,previousStock:number,newStock:number,delta:number,reason:string,saleId?:string,actorId:string,createdAt:string}} InventoryMovement */
/** @typedef {{id:string,ownerId:string,openedBy:string,businessName:string,registerName:string,openingAmount:number,cashAdjustmentsTotal:number,cashMovementsCount:number,voidedTotal:number,voidCount:number,closingAmount?:number,expectedClosingAmount?:number,difference?:number,cashSalesTotal:number,grossTotal:number,salesCount:number,status:'open'|'closed',openedAt:string,closedAt?:string}} CashSession */
/** @typedef {{id:string,ownerId:string,cashSessionId:string,type:'in'|'out',amount:number,note:string,createdAt:string}} CashMovement */
/** @typedef {{productId:string,code:string,name:string,category:string,unit:string,unitPrice:number,quantity:number,baseTotal:number,adjustment:{type:'none'|'discount'|'surcharge',percent:number},adjustmentAmount:number,lineTotal:number}} SaleItem */
/** @typedef {{id:string,ownerId:string,businessId:string,cashierId:string,cashierName:string,businessName:string,buyerName:string,cashSessionId:string,receiptNumber:number,registerName:string,items:SaleItem[],baseSubtotal:number,lineAdjustmentsTotal:number,subtotal:number,adjustment:{type:'none'|'discount'|'surcharge',percent:number},saleAdjustmentAmount:number,total:number,payments:{method:'cash'|'card'|'transfer',amount:number,reference:string}[],paymentMethod:'cash'|'card'|'transfer'|'mixed',amountReceived:number,change:number,transferConfirmedAt:string|null,transferConfirmedBy:string|null,requestHash:string,status:'completed'|'voided',voidReason?:string,voidedAt?:string,createdAt:string}} Sale */

export const CATEGORIES = ['Almacén', 'Bebidas', 'Lácteos', 'Panadería', 'Frutas y verduras', 'Limpieza', 'Otros'];
export const PAYMENT_METHODS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Combinado' };
export const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const receiptCode = number => `V-${String(number).padStart(6, '0')}`;
