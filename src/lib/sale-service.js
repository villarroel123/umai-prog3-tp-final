import { createHash } from 'node:crypto';
import { priceTicket } from './billing.js';
import { roundMoney } from './models.js';
import { assertPaymentTotal } from './sale-checkout.js';

function requestHash(checkout) {
  const input = {
    items: [...checkout.requested].sort(([a], [b]) => a.localeCompare(b)),
    adjustment: checkout.adjustment,
    payments: checkout.payments,
    amountReceived: checkout.amountReceived,
    transferConfirmed: checkout.transferConfirmed,
    customerName: checkout.customerName,
  };
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export async function recordSale(database, user, checkout) {
  const { checkoutId, requested, adjustment, payments, cashPortion, amountReceived, transferConfirmed } = checkout;
  const hash = requestHash(checkout);
  const saleRef = database.collection('sales').doc(checkoutId);
  const businessRef = database.collection('businesses').doc(user.businessId);
  const productRefs = [...requested.keys()].map(id => database.collection('products').doc(id));
  return database.runTransaction(async transaction => {
    const existing = await transaction.get(saleRef);
    if (existing.exists) {
      if (existing.data().ownerId !== user.businessId || (existing.data().requestHash && existing.data().requestHash !== hash)) throw new Error('Esta solicitud de cobro ya se usó para otra venta.');
      return { id: existing.id, ...existing.data() };
    }
    const business = await transaction.get(businessRef);
    if (!business.exists || business.data().ownerId !== user.businessId) throw new Error('No encontramos el negocio activo.');
    const sessionId = business.data().activeSessionId;
    if (!sessionId) throw new Error('Abrí la caja antes de cobrar.');
    const sessionRef = database.collection('cashSessions').doc(sessionId);
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists || sessionSnap.data().ownerId !== user.businessId || sessionSnap.data().status !== 'open') throw new Error('La caja activa ya no está disponible.');
    const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));
    const lines = productSnaps.map(snap => {
      const product = snap.data();
      const { quantity, adjustment: lineAdjustment } = requested.get(snap.id);
      if (!snap.exists || product.ownerId !== user.businessId || product.archivedAt || product.isActive === false) throw new Error('Uno de los productos ya no está disponible.');
      const price = product.salePrice ?? product.price;
      if (!Number.isFinite(price) || price <= 0 || price > 100000000 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) throw new Error(`Precio inválido de ${product.name}.`);
      if (!Number.isInteger(product.stock) || product.stock < quantity) throw new Error(`Stock insuficiente de ${product.name}.`);
      return { product: { id: snap.id, ...product, price }, quantity, adjustment: lineAdjustment };
    });
    const priced = priceTicket(lines, adjustment);
    if (!Number.isFinite(priced.total) || priced.total <= 0) throw new Error('El total de la venta debe ser mayor a cero.');
    assertPaymentTotal(payments, priced.total);
    const receiptNumber = business.data().nextReceiptNumber ?? 1;
    if (!Number.isSafeInteger(receiptNumber) || receiptNumber < 1) throw new Error('No se pudo generar el número de ticket.');
    const createdAt = new Date().toISOString();
    const data = {
      ownerId: user.businessId, businessId: user.businessId, cashierId: user.uid, cashierName: user.name,
      businessName: sessionSnap.data().businessName || user.name,
      buyerName: checkout.customerName || 'Consumidor final',
      cashSessionId: sessionId, registerName: sessionSnap.data().registerName,
      receiptNumber, items: priced.items, baseSubtotal: priced.baseSubtotal,
      lineAdjustmentsTotal: priced.lineAdjustmentsTotal, subtotal: priced.subtotal,
      adjustment: priced.adjustment, saleAdjustmentAmount: priced.saleAdjustmentAmount,
      total: priced.total, payments, paymentMethod: payments.length === 1 ? payments[0].method : 'mixed',
      amountReceived, change: cashPortion ? roundMoney(amountReceived - cashPortion) : 0,
      transferConfirmedAt: transferConfirmed ? createdAt : null,
      transferConfirmedBy: transferConfirmed ? user.uid : null,
      requestHash: hash, status: 'completed', createdAt,
    };
    for (let index = 0; index < productRefs.length; index++) {
      const previousStock = productSnaps[index].data().stock;
      const item = priced.items[index];
      const newStock = previousStock - item.quantity;
      transaction.update(productRefs[index], { stock: newStock, updatedAt: createdAt });
      transaction.create(database.collection('inventoryMovements').doc(`${checkoutId}_${item.productId}`), {
        ownerId: user.businessId, businessId: user.businessId, saleId: checkoutId,
        productId: item.productId, productName: item.name, previousStock, newStock,
        delta: -item.quantity, reason: 'sale', actorId: user.uid, createdAt,
      });
    }
    transaction.create(saleRef, data);
    transaction.update(businessRef, { nextReceiptNumber: receiptNumber + 1 });
    transaction.update(sessionRef, {
      salesCount: (sessionSnap.data().salesCount || 0) + 1,
      grossTotal: roundMoney((sessionSnap.data().grossTotal || 0) + priced.total),
      cashSalesTotal: roundMoney((sessionSnap.data().cashSalesTotal || 0) + cashPortion),
    });
    return { id: checkoutId, ...data };
  });
}
