'use client';
import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

export default function CategoryManager({ categories, onChange, onClose }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(editing ? `/api/categories/${editing}` : '/api/categories', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la categoría.');
      setName(''); setEditing(null); await onChange();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function remove(category) {
    if (!window.confirm(`¿Eliminar la categoría ${category.name}?`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar la categoría.');
      await onChange();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal category-modal" role="dialog" aria-modal="true" aria-label="Administrar categorías">
    <div className="modal-head"><div><span className="eyebrow">INVENTARIO</span><h2>Categorías</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button></div>
    <p>Organizá el catálogo con categorías propias de tu negocio.</p>
    <div className="category-list">{categories.map(category => <div key={category.id}><span>{category.name}</span>{category.isDefault ? <small>Incluida</small> : <div className="row-actions"><button type="button" onClick={() => { setEditing(category.id); setName(category.name); setError(''); }} aria-label={`Renombrar ${category.name}`}><Pencil size={16}/></button><button type="button" onClick={() => remove(category)} disabled={busy} aria-label={`Eliminar ${category.name}`}><Trash2 size={16}/></button></div>}</div>)}</div>
    <form onSubmit={save}><label>{editing ? 'Nuevo nombre' : 'Nueva categoría'}<input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={40} required placeholder="Ej. Snacks"/></label>{error && <div className="alert-error" role="alert">{error}</div>}<div className="modal-actions">{editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setName(''); }}>Cancelar edición</button>}<button className="button-primary" disabled={busy}><Plus size={16}/>{editing ? 'Guardar nombre' : 'Crear categoría'}</button></div></form>
  </div></div>;
}
