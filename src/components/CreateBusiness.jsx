'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CreateBusiness() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el negocio.');
      window.location.assign('/negocio');
    } catch (cause) { setError(cause.message); setBusy(false); }
  }
  return <div className="inner-page"><div className="page-top"><div><span className="eyebrow">PRIMER PASO</span><h1>Tu negocio en caja<span className="accent">.</span></h1><p>Elegí un nombre para empezar. Podés cambiarlo después.</p></div></div><div className="settings-card"><form onSubmit={submit}><label>Nombre del negocio<input value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={60} autoFocus placeholder="Mi negocio"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? 'Creando...' : 'Crear negocio'}</button></form><p>¿Recibiste una invitación? Abrí el enlace que te compartió el propietario.</p><Link href="/cuenta">Ver mi cuenta</Link></div></div>;
}
