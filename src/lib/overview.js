import { roundMoney } from './models.js';

function localDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildOverview(sales, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    date.setDate(date.getDate() - 6 + index);
    return { key: localDay(date), label: date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }), total: 0, count: 0 };
  });
  const byDay = new Map(days.map(day => [day.key, day]));
  const valid = sales.filter(sale => sale.status !== 'voided');
  const top = new Map();
  for (const sale of valid) {
    const day = byDay.get(localDay(new Date(sale.createdAt)));
    if (!day) continue;
    day.total = roundMoney(day.total + sale.total);
    day.count += 1;
    for (const item of sale.items || []) {
      const current = top.get(item.productId) || { id: item.productId, name: item.name, quantity: 0, total: 0 };
      current.quantity += item.quantity;
      current.total = roundMoney(current.total + item.lineTotal);
      top.set(item.productId, current);
    }
  }
  const today = days[6];
  return {
    todayTotal: today.total,
    todayCount: today.count,
    averageTicket: today.count ? roundMoney(today.total / today.count) : 0,
    days,
    topProducts: [...top.values()].sort((a, b) => b.quantity - a.quantity || b.total - a.total).slice(0, 5),
    latestSales: [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  };
}

