import { roundMoney } from './models.js';
import { netSaleTotal, remainingQuantity, saleStatusLabel } from './sale-history.js';

export function filterSales(sales, { from = '', to = '', product = '', payment = '' } = {}) {
  const needle = product.trim().toLocaleLowerCase();
  return sales.filter(sale => {
    const day = new Date(sale.createdAt);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return (!from || date >= from) && (!to || date <= to) && (!needle || sale.items.some(item => `${item.name} ${item.code}`.toLocaleLowerCase().includes(needle))) && (!payment || (sale.payments || [{ method: sale.paymentMethod }]).some(row => row.method === payment));
  });
}

export function summarizeSales(sales) {
  const valid = sales.filter(sale => ['completed', 'partially_returned'].includes(sale.status));
  const paymentTotals = { cash: 0, card: 0, transfer: 0 };
  const products = new Map();
  for (const sale of sales.filter(sale => sale.status !== 'voided')) {
    for (const payment of sale.payments || [{ method: sale.paymentMethod, amount: sale.total }]) if (payment.method in paymentTotals) paymentTotals[payment.method] += payment.amount;
    for (const [method, refunded] of Object.entries(sale.refundedByMethod || {})) if (method in paymentTotals) paymentTotals[method] -= refunded;
  }
  for (const sale of valid) {
    for (const item of sale.items) {
      const key = item.productId;
      const existing = products.get(key) || { name: item.name, quantity: 0, total: 0 };
      const remaining = remainingQuantity(sale, item);
      existing.quantity += remaining; existing.total += item.lineTotal * remaining / item.quantity;
      products.set(key, existing);
    }
  }
  return {
    count: valid.length,
    voidCount: sales.filter(sale => sale.status === 'voided').length,
    total: roundMoney(valid.reduce((sum, sale) => sum + netSaleTotal(sale), 0)),
    paymentTotals: Object.fromEntries(Object.entries(paymentTotals).map(([method, amount]) => [method, roundMoney(amount)])),
    products: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
  };
}

function csvCell(value) {
  const raw = String(value ?? '');
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function salesCsv(sales) {
  const rows = [['Comprobante', 'Fecha', 'Estado', 'Negocio', 'Comprador', 'Productos', 'Medios de pago', 'Total', 'Motivo de anulación']];
  for (const sale of sales) rows.push([
    sale.receiptNumber, sale.createdAt, saleStatusLabel(sale.status), sale.businessName, sale.buyerName,
    sale.items.map(item => `${item.quantity} × ${item.name}`).join(' | '),
    (sale.payments || [{ method: sale.paymentMethod, amount: sale.total }]).map(payment => `${payment.method}: ${payment.amount}`).join(' | '),
    netSaleTotal(sale), sale.voidReason || '',
  ]);
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
