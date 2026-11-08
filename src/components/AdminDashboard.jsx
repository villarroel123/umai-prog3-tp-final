'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { money } from '@/lib/models';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all(['/api/users', '/api/products', '/api/sales'].map(async url => { const response = await fetch(url); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })).then(([u, p, s]) => { setUsers(u.users); setProducts(p.products); setSales(s.sales); }).catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, []);
  const businesses = new Set(users.filter(user => user.role !== 'admin').map(user => user.businessId || user.uid));
  const validSales = sales.filter(sale => sale.status !== 'voided');
  return <div className="inner-page"><div className="page-top"><div><span className="eyebrow">ADMINISTRACIÓN / VISTA GENERAL</span><h1>El sistema, claro<span className="accent">.</span></h1><p>Usuarios, negocios y actividad registrados.</p></div><div className="page-emblem"><ShieldCheck size={26}/></div></div><div className="stats-grid"><div><span>Usuarios registrados</span><strong>{users.length}</strong></div><div><span>Negocios</span><strong>{businesses.size}</strong><small>{products.length} productos cargados</small></div><div><span>Cobros válidos</span><strong>{validSales.length}</strong><small>{money(validSales.reduce((sum, sale) => sum + sale.total, 0))} en ventas</small></div></div><div className="section-bar"><div><span className="eyebrow">PERMISOS</span><h2>Usuarios y roles</h2></div></div>{error && <div className="alert-error" role="alert">{error}</div>}{loading ? <div className="data-empty">Cargando usuarios...</div> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Negocio</th></tr></thead><tbody>{users.map(user => <tr key={user.uid}><td><strong>{user.name}</strong></td><td>{user.email}</td><td><span className="role-tag">{user.role === 'admin' ? 'Administrador' : 'Propietario'}</span></td><td>{user.role === 'admin' ? '—' : user.businessId || user.uid}</td></tr>)}</tbody></table>{!users.length && <div className="data-empty">No hay usuarios registrados.</div>}</div>}</div>;
}