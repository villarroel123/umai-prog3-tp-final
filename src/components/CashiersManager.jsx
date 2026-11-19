'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RotateCcw, UserRound, X } from 'lucide-react';

const initialForm = { name: '', username: '', password: '', confirmPassword: '', registerId: '', permissions: { sell: true, viewStock: true, manageCash: false, adjustPrices: false, processReturns: false } };
const date = value => value ? new Date(value).toLocaleString('es-AR') : 'Todavía no ingresó';

export default function CashiersManager({ registers }) {
  const [cashiers, setCashiers] = useState([]);
  const [businessCode, setBusinessCode] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/cashiers', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los cajeros.');
    setCashiers(data.cashiers || []);
    setBusinessCode(data.businessCode || '');
  }, []);
  useEffect(() => { refresh().catch(cause => setError(cause.message)).finally(() => setLoading(false)); }, [refresh]);

  function startCreate() { setEditing(null); setForm(initialForm); setError(''); setOpen(true); }
  function startEdit(cashier) { setEditing(cashier.id); setForm({ name: cashier.name, username: cashier.username, password: '', confirmPassword: '', registerId: cashier.registerId || '', permissions: cashier.permissions || initialForm.permissions }); setError(''); setOpen(true); }
  function setField(key, value) { setForm(current => ({ ...current, [key]: value })); }
  function setPermission(key, value) { setForm(current => ({ ...current, permissions: { ...current.permissions, [key]: value } })); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(editing ? `/api/cashiers/${encodeURIComponent(editing)}` : '/api/cashiers', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { name: form.name, username: form.username, registerId: form.registerId, permissions: form.permissions } : form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el cajero.');
      setOpen(false); setNotice(editing ? 'Los datos del cajero se actualizaron.' : 'El cajero fue creado. Compartí el código del negocio, su usuario y su clave inicial de forma privada.');
      await refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  async function changeStatus(cashier) {
    const status = cashier.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${status === 'inactive' ? 'Desactivar' : 'Activar'} a ${cashier.name}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/cashiers/${encodeURIComponent(cashier.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cambiar el estado.');
      setNotice(status === 'inactive' ? 'Cajero desactivado.' : 'Cajero activado.'); await refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  async function resetPassword(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/cashiers/${encodeURIComponent(resetting.id)}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resetForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo restablecer la contraseña.');
      setResetting(null); setResetForm({ password: '', confirmPassword: '' });
      setNotice('Clave temporal actualizada. El cajero deberá cambiarla al ingresar.'); await refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  return <div className="cashiers-manager">
    <div className="cashiers-toolbar"><div><strong>Acceso de cajeros</strong><p>Para ingresar, el empleado necesita el código del negocio y sus credenciales.</p><code>{businessCode || 'Cargando código...'}</code></div><button type="button" className="button-primary" onClick={startCreate}><Plus size={17}/> Agregar cajero</button></div>
    {notice && <div className="alert-success" role="status">{notice}</div>}
    {error && <div className="alert-error" role="alert">{error}</div>}
    {loading ? <div className="data-empty">Cargando cajeros...</div> : cashiers.length ? <div className="cashiers-table-wrap"><table className="cashiers-table"><thead><tr><th>Nombre</th><th>Usuario</th><th>Caja asignada</th><th>Estado</th><th>Creado</th><th>Último acceso</th><th>Acciones</th></tr></thead><tbody>{cashiers.map(cashier => <tr key={cashier.id}><td><strong>{cashier.name}</strong></td><td>{cashier.username}</td><td>{registers.find(register => register.id === cashier.registerId)?.name || cashier.registerId || 'Sin asignar'}</td><td><span className={`cashier-status ${cashier.status}`}>{cashier.status === 'active' ? 'Activo' : 'Inactivo'}</span></td><td>{date(cashier.createdAt)}</td><td>{date(cashier.lastAccessAt)}</td><td><div className="cashier-actions"><button type="button" disabled={busy} onClick={() => startEdit(cashier)} title="Editar"><Pencil size={16}/><span>Editar</span></button><button type="button" disabled={busy} onClick={() => { setResetting(cashier); setResetForm({ password: '', confirmPassword: '' }); setError(''); }} title="Restablecer clave"><RotateCcw size={16}/><span>Clave</span></button><button type="button" disabled={busy} onClick={() => changeStatus(cashier)}>{cashier.status === 'active' ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}</tbody></table></div> : <div className="history-empty"><UserRound size={28}/><h2>Sin cajeros todavía</h2><p>Agregá un empleado para darle acceso a la caja.</p></div>}
    {open && <div className="cashier-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><div className="cashier-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Editar cajero' : 'Agregar cajero'}><div className="cashier-modal-head"><h2>{editing ? 'Editar cajero' : 'Agregar cajero'}</h2><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={20}/></button></div><form onSubmit={submit}><label>Nombre completo<input value={form.name} onChange={event => setField('name', event.target.value)} minLength={2} maxLength={80} required/></label><label>Nombre de usuario<input value={form.username} onChange={event => setField('username', event.target.value)} minLength={3} maxLength={24} autoComplete="off" required/><small>3 a 24 caracteres: letras, números, punto, guion o guion bajo.</small></label>{!editing && <><label>Contraseña inicial<input type="password" value={form.password} onChange={event => setField('password', event.target.value)} minLength={10} autoComplete="new-password" required/><small>Al menos 10 caracteres, con letras y números.</small></label><label>Confirmar contraseña<input type="password" value={form.confirmPassword} onChange={event => setField('confirmPassword', event.target.value)} minLength={10} autoComplete="new-password" required/></label></>}<label>Caja asignada<select value={form.registerId} onChange={event => setField('registerId', event.target.value)}><option value="">Sin asignar</option>{registers.map(register => <option key={register.id} value={register.id}>{register.name}</option>)}</select></label><fieldset><legend>Permisos operativos</legend><label><input type="checkbox" checked={form.permissions.sell === true} onChange={event => setPermission('sell', event.target.checked)}/> Registrar ventas</label><label><input type="checkbox" checked={form.permissions.viewStock === true} disabled={form.permissions.sell === true} onChange={event => setPermission('viewStock', event.target.checked)}/> Consultar productos y stock</label><label><input type="checkbox" checked={form.permissions.manageCash === true} onChange={event => setPermission('manageCash', event.target.checked)}/> Abrir, cerrar y registrar movimientos de su caja</label><label><input type="checkbox" checked={form.permissions.adjustPrices === true} onChange={event => setPermission('adjustPrices', event.target.checked)}/> Aplicar ofertas, recargos y precios puntuales</label><label><input type="checkbox" checked={form.permissions.processReturns === true} onChange={event => setPermission('processReturns', event.target.checked)}/> Procesar devoluciones de ventas</label></fieldset><div className="cashier-form-actions"><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="button-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar cajero'}</button></div></form></div></div>}
    {resetting && <div className="cashier-modal-backdrop"><div className="cashier-modal" role="dialog" aria-modal="true" aria-label="Restablecer contraseña"><div className="cashier-modal-head"><h2>Clave temporal de {resetting.name}</h2><button type="button" aria-label="Cerrar" onClick={() => setResetting(null)}><X size={20}/></button></div>{error && <p className="form-error" role="alert">{error}</p>}<form onSubmit={resetPassword}><label>Nueva clave temporal<input type="password" value={resetForm.password} onChange={event => setResetForm(current => ({ ...current, password: event.target.value }))} minLength={10} autoComplete="new-password" required/><small>Mínimo 10 caracteres, con letras y números.</small></label><label>Confirmar clave<input type="password" value={resetForm.confirmPassword} onChange={event => setResetForm(current => ({ ...current, confirmPassword: event.target.value }))} minLength={10} autoComplete="new-password" required/></label><div className="cashier-form-actions"><button type="button" onClick={() => setResetting(null)}>Cancelar</button><button className="button-primary" disabled={busy}>Restablecer clave</button></div></form></div></div>}
  </div>;
}
