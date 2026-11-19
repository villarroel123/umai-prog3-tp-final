import { receiptCode, roundMoney } from './models.js';

export function netSaleTotal(sale) { return sale.status === 'voided' || sale.status === 'returned' ? 0 : roundMoney(sale.total - (sale.refundedTotal || 0)); }
export function remainingQuantity(sale, item) { return sale.status === 'voided' ? 0 : Math.max(0, item.quantity - (sale.returnedQuantities?.[item.productId] || 0)); }
export function saleStatusLabel(status) { return ({ completed: 'Completada', partially_returned: 'Devolución parcial', returned: 'Devuelta', voided: 'Anulada' })[status] || status; }

export function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function filterSales(sales, { search = '', date = '', method = '', status = '' } = {}) {
  const term = search.trim().toLowerCase();
  return sales.filter(sale =>
    (!term || receiptCode(sale.receiptNumber).toLowerCase().includes(term) || String(sale.receiptNumber).includes(term)) &&
    (!date || localDateKey(sale.createdAt) === date) &&
    (!method || sale.paymentMethod === method || (method !== 'mixed' && sale.payments?.some(payment => payment.method === method))) &&
    (!status || sale.status === status)
  );
}

export function salesSummary(sales) {
  const completed = sales.filter(sale => ['completed', 'partially_returned'].includes(sale.status));
  const total = roundMoney(completed.reduce((sum, sale) => sum + netSaleTotal(sale), 0));
  return { total, count: completed.length, average: completed.length ? roundMoney(total / completed.length) : 0 };
}
