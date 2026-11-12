'use client';
import Link from 'next/link';
import { ArrowRight, LockKeyhole, ReceiptText } from 'lucide-react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { auth } from '@/lib/firebase-client';
import { establishSession } from '@/lib/client-session';
import { landingFor } from '@/lib/roles';
const googleError = error => ({
  'auth/operation-not-allowed': 'El acceso con Google todavía no está habilitado en Firebase Authentication.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado para ingresar con Google. Revisá Authentication → Settings → Authorized domains.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes e intentá otra vez.',
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de completar el acceso.',
  'auth/cancelled-popup-request': 'Ya hay un intento de acceso en curso. Intentá nuevamente.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo y otro método de acceso. Ingresá con ese método primero.',
  'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisá tu conexión e intentá nuevamente.',
})[error.code] || error.message || 'No se pudo ingresar con Google.';
function popupWithTimeout(promise) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Google tardó demasiado en responder. Cerrá la ventana de acceso e intentá nuevamente.')), 30000); })]).finally(() => clearTimeout(timer));
}
function Inner({ initialMode }) {
  const params = useSearchParams(); const mode = initialMode; const [name, setName] = useState(''); const [businessName, setBusinessName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const next = params.get('next'); const requestedDestination = next?.startsWith('/') && !next.startsWith('//') ? next : null;
  async function finish(firebaseUser) {
    const user = await establishSession(firebaseUser);
    if (mode === 'register' && businessName.trim() && !user?.role) {
      const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: businessName.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el negocio. Ingresá nuevamente para reintentar.');
      window.location.assign('/negocio');
      return;
    }
    window.location.assign(requestedDestination || landingFor(user?.role));
  }
  async function submit(event) { event.preventDefault(); setError(''); setBusy(true); try { if (!auth) throw new Error('Configurá Firebase en .env.local para ingresar.'); if (mode === 'register' && name.trim().length < 2) throw new Error('Ingresá tu nombre.'); if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.'); const result = mode === 'register' ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password); if (mode === 'register') { await updateProfile(result.user, { displayName: name.trim() }); await result.user.getIdToken(true); } await finish(result.user); } catch (e) { setError(e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado.' : e.message); } finally { setBusy(false); } }
  async function google() { setError(''); setBusy(true); try { if (!auth) throw new Error('Configurá Firebase para ingresar.'); const result = await popupWithTimeout(signInWithPopup(auth, new GoogleAuthProvider())); await finish(result.user); } catch (e) { setError(googleError(e)); } finally { setBusy(false); } }
  return <div className="auth-page"><div className="auth-art"><span className="eyebrow">CAJA · SISTEMA DE COBROS</span><div className="auth-art-icon"><ReceiptText size={50}/></div><h2>Cada venta,<br/><em>bien hecha.</em></h2><p>Una forma simple de registrar productos, cobrar y consultar cada comprobante.</p><span className="auth-art-foot">PRODUCTOS / CAJA / COBROS / HISTORIAL</span></div><div className="auth-panel"><div className="auth-form-wrap"><Link href="/" className="back-link">← Volver al inicio</Link><div className="auth-lock"><LockKeyhole size={20}/></div><span className="eyebrow">ACCESO SEGURO</span><h1>{mode === 'login' ? 'Ingresá a tu cuenta.' : 'Creá tu cuenta.'}</h1><p>{mode === 'login' ? 'Ingresá para gestionar tu negocio y registrar cobros.' : 'Creá tu cuenta para administrar un negocio o aceptar una invitación.'}</p><form onSubmit={submit}>{mode === 'register' && <><label>Nombre<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required minLength={2} placeholder="Tu nombre"/></label><label>Nombre del negocio<input value={businessName} onChange={e => setBusinessName(e.target.value)} required minLength={2} maxLength={60} placeholder="Mi negocio"/></label></>}<label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="hola@ejemplo.com"/></label><label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} placeholder="Mínimo 6 caracteres"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? 'Un momento...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'} <ArrowRight size={18}/></button></form><div className="auth-divider">o continuá con</div><button className="google-button" onClick={google} disabled={busy}><strong>G</strong> Google</button><p className="auth-switch">{mode === 'login' ? '¿Todavía no tenés cuenta?' : '¿Ya tenés cuenta?'} <Link href={mode === 'login' ? '/crear-cuenta' : '/login'}>{mode === 'login' ? 'Registrate' : 'Ingresá'}</Link></p></div></div></div>;
}
export default function AuthForm({ initialMode = 'login' }) { return <Suspense fallback={<div className="inner-page">Cargando...</div>}><Inner initialMode={initialMode}/></Suspense>; }
