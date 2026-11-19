'use client';
import Link from 'next/link';
import { signInWithCustomToken } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase-client';
import { establishSession } from '@/lib/client-session';

export default function CashierPasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    let passwordUpdated = false;
    try {
      const response = await fetch('/api/cashiers/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cambiar la contraseña.');
      passwordUpdated = true;
      setCompleted(true);
      const result = await signInWithCustomToken(auth, data.token);
      await establishSession(result.user);
      window.location.assign('/caja');
    } catch (cause) { setError(passwordUpdated ? 'La clave se actualizó. Volvé a ingresar con la nueva contraseña.' : cause.message); }
    finally { setBusy(false); }
  }
  return <div className="cashier-password-page"><div className="settings-card"><h2>Elegí una contraseña nueva</h2><p>Para proteger tu acceso, cambiá la clave inicial antes de empezar a cobrar.</p>{completed ? <Link href="/login" className="button-primary">Volver a ingresar</Link> : <form onSubmit={submit}><label>Contraseña inicial<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required/></label><label>Nueva contraseña<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={10} required placeholder="Mínimo 10 caracteres, letras y números"/></label><label>Confirmar contraseña<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={10} required/></label><button className="button-primary" disabled={busy}>{busy ? 'Guardando...' : 'Cambiar contraseña'}</button></form>}{error && <p className="form-error" role="alert">{error}</p>}</div></div>;
}
