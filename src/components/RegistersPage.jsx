'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, UsersRound, Wallet, X } from 'lucide-react';
import { money } from '@/lib/models';

function RegisterCard({ register, editing, editName, setEditName, onEdit, onDelete, onCancel }) {
  const latestSession = register.latestSession;
  const status = latestSession?.status;

  return (
    <article className="account-card">
      <Wallet size={24} />
      <span className="eyebrow">
        {status === 'open' ? 'TURNO ABIERTO' : 'CAJA'}
      </span>
      <h2>{register.name}</h2>
      <p>
        Creada {new Date(register.createdAt).toLocaleDateString('es-AR')} ·{' '}
        {register.sessionCount} {register.sessionCount === 1 ? 'turno' : 'turnos'}
      </p>

      {latestSession ? (
        <div className="register-info">
          <div>
            <UsersRound size={16} />
            <span>
              <strong>{latestSession.cashier || 'Cajero sin identificar'}</strong>
              <small>Último cajero</small>
            </span>
          </div>
          <span>
            Estado
            <strong>{status === 'open' ? 'Abierta' : 'Cerrada'}</strong>
          </span>
          <span>
            Último turno
            <strong>{new Date(latestSession.openedAt).toLocaleString('es-AR')}</strong>
          </span>
          <span>
            Ventas del turno
            <strong>{latestSession.salesCount}</strong>
          </span>
          <span>
            Total vendido
            <strong>{money(latestSession.grossTotal)}</strong>
          </span>
        </div>
      ) : (
        <p>Todavía no tiene turnos registrados.</p>
      )}

      {editing ? (
        <form className="register-edit-form" onSubmit={onEdit}>
          <label>
            Nombre de la caja
            <input
              value={editName}
              onChange={event => setEditName(event.target.value)}
              minLength={2}
              maxLength={30}
              required
            />
          </label>
          <div className="register-actions">
            <button className="button-primary" type="submit">Guardar</button>
            <button className="register-action-button" type="button" onClick={onCancel} aria-label="Cancelar edición">
              <X size={16} /> Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="register-actions">
          <button className="register-action-button" type="button" onClick={() => onCancel(register)}>
            <Pencil size={16} /> Editar
          </button>
          <button className="register-action-button danger" type="button" onClick={() => onDelete(register)}>
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      )}
    </article>
  );
}

export default function RegistersPage() {
  const [registers, setRegisters] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/registers');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar las cajas.');
    }

    setRegisters(data.registers || []);
  }, []);

  useEffect(() => {
    refresh()
      .catch(cause => setError(cause.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/registers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear la caja.');
      }

      setName('');
      setNotice(`La caja “${data.register.name}” quedó creada.`);
      await refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function update(event, register) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/registers/${encodeURIComponent(register.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo editar la caja.');

      setEditingId(null);
      setNotice(`La caja se cambió a “${data.register.name}”.`);
      await refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(register) {
    if (!window.confirm(`¿Querés eliminar la caja “${register.name}”?`)) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/registers/${encodeURIComponent(register.id)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar la caja.');

      setNotice(`La caja “${register.name}” fue eliminada.`);
      await refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inner-page">
      <div className="page-top">
        <div>
          <span className="eyebrow">MI NEGOCIO / OPERACIÓN</span>
          <h1>
            Cajas<span className="accent">.</span>
          </h1>
          <p>
            Administrá las cajas del negocio y consultá quién las usa y su
            actividad reciente.
          </p>
        </div>
        <div className="page-emblem">
          <Wallet size={26} />
        </div>
      </div>

      <section className="settings-card">
        <h2>Agregar cajero</h2>
        <form onSubmit={create}>
          <label>
            Nombre del cajero
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              minLength={2}
              maxLength={30}
              placeholder="Camila"
              required
            />
          </label>
          <button className="button-primary" disabled={busy}>
            <Plus size={17} />
            {busy ? 'Creando...' : 'Agregar caja'}
          </button>
        </form>
      </section>

      {error && <div className="alert-error" role="alert">{error}</div>}
      {notice && <div className="alert-success" role="status">{notice}</div>}

      <div className="section-bar">
        <div>
          <span className="eyebrow">CONFIGURACIÓN Y ACTIVIDAD</span>
          <h2>Cuentas de cajeros registrados</h2>
        </div>
        <span className="role-tag">
          {registers.length} {registers.length === 1 ? 'caja' : 'cajas'}
        </span>
      </div>

      {loading ? (
        <div className="data-empty">Cargando cajas...</div>
      ) : registers.length ? (
        <div className="account-grid">
          {registers.map(register => (
            <RegisterCard
              key={register.id}
              register={register}
              editing={editingId === register.id}
              editName={editName}
              setEditName={setEditName}
              onEdit={event => update(event, register)}
              onDelete={remove}
              onCancel={value => {
                if (value) {
                  setEditingId(value.id);
                  setEditName(value.name);
                } else {
                  setEditingId(null);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="history-empty">
          <Wallet size={34} />
          <h2>Todavía no hay cajas configuradas.</h2>
          <p>Agregá una caja con el formulario para empezar.</p>
        </div>
      )}
    </div>
  );
}
