import { receiptCode, roundMoney } from './models.js';

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
  const completed = sales.filter(sale => sale.status === 'completed');
  const total = roundMoney(completed.reduce((sum, sale) => sum + sale.total, 0));
  return { total, count: completed.length, average: completed.length ? roundMoney(total / completed.length) : 0 };
}
