'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function JoinInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [invitation, setInvitation] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!token) { setError('Falta el enlace de invitación.'); return; } Promise.all([fetch(`/api/business/invitations/accept?token=${encodeURIComponent(token)}`).then(response => response.json()), fetch('/api/session').then(response => response.json())]).then(([invite, session]) => { if (invite.error) throw new Error(invite.error); setInvitation(invite); setUser(session.user); }).catch(cause => setError(cause.message)); }, [token]);
  async function accept() { setBusy(true); setError(''); try { const response = await fetch('/api/business/invitations/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.push('/panel'); router.refresh(); } catch (cause) { setError(cause.message); setBusy(false); } }
  return <div className="inner-page join-page"><span className="eyebrow">CAJA. / INVITACIÓN</span><h1>Unite al negocio<span className="accent">.</span></h1>{error && <div className="alert-error" role="alert">{error}</div>}{!error && !invitation && <p>Cargando invitación...</p>}{invitation && <div className="settings-card"><h2>{invitation.businessName}</h2><p>La invitación es para <strong>{invitation.email}</strong>. Al aceptarla, vas a compartir inventario, caja y ventas con los demás propietarios.</p>{!user ? <Link className="button-primary" href={`/login?next=${encodeURIComponent(`/unirse?token=${token}`)}`}>Ingresar con esta cuenta</Link> : user.email.toLowerCase() !== invitation.email ? <p className="alert-error">Ingresaste como {user.email}. Cerrá sesión e ingresá con {invitation.email}.</p> : <button className="button-primary" onClick={accept} disabled={busy}>{busy ? 'Uniéndote...' : 'Aceptar invitación'}</button>}</div>}</div>;
}
export default function JoinBusiness() { return <Suspense fallback={<div className="inner-page">Cargando...</div>}><JoinInner/></Suspense>; }
