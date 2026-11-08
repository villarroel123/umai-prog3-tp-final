'use client';
import { money } from '@/lib/models';

export default function SalesChart({ days }) {
  const maximum = Math.max(...days.map(day => day.total), 1);
  const points = days.map((day, index) => ({ x: 28 + index * 100, y: 174 - day.total / maximum * 128 }));
  const curve = points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const area = `${curve} L ${points.at(-1).x} 180 L ${points[0].x} 180 Z`;
  return <div className="overview-line-chart" role="img" aria-label={`Ventas de los últimos siete días: ${days.map(day => `${day.label}, ${money(day.total)}`).join('; ')}`}>
    <svg viewBox="0 0 656 205" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#AC75EF" stopOpacity="0.27"/><stop offset="100%" stopColor="#AC75EF" stopOpacity="0"/></linearGradient></defs>
      {[46, 90, 134, 180].map(y => <line key={y} x1="28" x2="628" y1={y} y2={y} stroke="#E9E9ED" strokeDasharray="4 7"/>)}
      <path d={area} fill="url(#sales-area)"/><path d={curve} fill="none" stroke="#A66DE8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      {points.map((point, index) => <circle key={days[index].key} cx={point.x} cy={point.y} r={index === points.length - 1 ? 6 : 3.5} fill={index === points.length - 1 ? '#17171B' : '#FFFFFF'} stroke="#A66DE8" strokeWidth="2" vectorEffect="non-scaling-stroke"/>)}
    </svg><div className="overview-line-labels">{days.map(day => <span key={day.key}>{day.label}</span>)}</div>
  </div>;
}
