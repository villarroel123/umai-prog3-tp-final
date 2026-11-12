'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/users').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users);
    }).catch(cause => setError(cause.message)).finally(() => setLoading(false));
  }, []);
  return <div className="inner-page"><div className="page-top"><div><span className="eyebrow">ADMINISTRACIÓN / PLATAFORMA</span><h1>El sistema, claro<span className="accent">.</span></h1><p>Acceso a los perfiles de la plataforma. La gestión de negocios y soporte se completará en la Etapa 5.</p></div><div className="page-emblem"><ShieldCheck size={26}/></div></div><div className="stats-grid"><div><span>Usuarios registrados</span><strong>{loading ? '—' : users.length}</strong></div><div><span>Negocios identificados</span><strong>{loading ? '—' : new Set(users.map(user => user.businessId).filter(Boolean)).size}</strong><small>Dato calculado a partir de las cuentas</small></div></div>{error && <div className="alert-error" role="alert">{error}</div>}<div className="section-bar"><div><span className="eyebrow">ACCESOS</span><h2>Usuarios y roles</h2></div></div>{loading ? <div className="data-empty">Cargando usuarios...</div> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Negocio</th><th>Estado</th></tr></thead><tbody>{users.map(user => <tr key={user.uid}><td><strong>{user.name}</strong></td><td>{user.email}</td><td><span className="role-tag">{user.role === 'platform_admin' ? 'Administrador' : user.role === 'cashier' ? 'Cajero' : 'Jefe de negocio'}</span></td><td>{user.businessId || '—'}</td><td>{user.status === 'suspended' ? 'Suspendido' : 'Activo'}</td></tr>)}</tbody></table>{!users.length && <div className="data-empty">No hay usuarios registrados.</div>}</div>}</div>;
}
