'use client';
import { useEffect, useState } from 'react';
import { Check, Copy, Settings2, UserPlus } from 'lucide-react';

export default function BusinessSettings() {
  const [business, setBusiness] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/business').then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setBusiness(data.business); setName(data.business.name); setMembers(data.members); setInvitations(data.invitations); }).catch(cause => setError(cause.message)); }, []);
  async function rename(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const response = await fetch('/api/business', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setBusiness(current => ({ ...current, name: data.name })); setMessage('Nombre actualizado.'); } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function invite(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setInviteUrl('');
    try { const response = await fetch('/api/business/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setInviteUrl(data.invitationUrl); setInvitations(current => [...current, { email: data.email, expiresAt: data.expiresAt }]); setEmail(''); setMessage('Invitación creada. Copiá el enlace y compartilo con esa persona.'); } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  return <div className="inner-page"><div className="page-top"><div><span className="eyebrow">MI NEGOCIO / CONFIGURACIÓN</span><h1>Configuración<span className="accent">.</span></h1><p>Datos del negocio y acceso de propietarios.</p></div><div className="page-emblem"><Settings2 size={25}/></div></div>
    {error && <div className="alert-error" role="alert">{error}</div>}{message && <div className="catalog-import-note" role="status">{message}</div>}
    {!business ? <div className="data-empty">Cargando negocio...</div> : <div className="settings-grid">
      <section className="settings-card"><span className="eyebrow">IDENTIDAD</span><h2>Nombre del negocio</h2><p>Se muestra en el panel y en la caja.</p><form onSubmit={rename}><label>Nombre<input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={60} required/></label><button className="button-primary" disabled={busy || name.trim() === business.name}>{busy ? 'Guardando...' : 'Guardar nombre'}</button></form></section>
      <section className="settings-card"><span className="eyebrow">EQUIPO</span><h2>Propietarios</h2><p>Todos los propietarios del negocio comparten productos, caja y ventas.</p><div className="settings-members">{members.length ? members.map(member => <div key={member.uid}><span><strong>{member.name || member.email}</strong><small>{member.email}</small></span><Check size={17}/></div>) : <p>Tu cuenta es la primera propietaria.</p>}</div><form onSubmit={invite}><label>Invitar por correo<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="persona@correo.com" required/></label><button className="button-primary" disabled={busy}><UserPlus size={16}/> Crear invitación</button></form>{inviteUrl && <div className="settings-invite-link"><input readOnly value={inviteUrl} aria-label="Enlace de invitación"/><button type="button" onClick={() => navigator.clipboard.writeText(inviteUrl)}><Copy size={16}/> Copiar</button></div>}<small>La invitación vence en 7 días. Enviá el enlace a la persona invitada; debe ingresar con el mismo correo.</small>{invitations.length > 0 && <div className="settings-pending"><strong>Invitaciones pendientes</strong>{invitations.map((item, index) => <span key={`${item.email}-${index}`}>{item.email} · vence {new Date(item.expiresAt).toLocaleDateString('es-AR')}</span>)}</div>}</section>
    </div>}</div>;
}
