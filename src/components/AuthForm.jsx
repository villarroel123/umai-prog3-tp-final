'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { auth } from '@/lib/firebase-client';
function Inner() {
  const router = useRouter(); const params = useSearchParams();
  const [mode, setMode] = useState('login'); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const destination = params.get('next')?.startsWith('/') && !params.get('next')?.startsWith('//') ? params.get('next') : '/cuenta';
  async function finish(firebaseUser) {
    const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: await firebaseUser.getIdToken(true) }) });
    if (!response.ok) throw new Error('No se pudo iniciar la sesión.');
    router.push(destination); router.refresh();
  }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (!auth) throw new Error('Configurá Firebase en .env.local para ingresar.');
      if (mode === 'register' && name.trim().length < 2) throw new Error('Ingresá tu nombre.');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      const result = mode === 'register' ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
      if (mode === 'register') { await updateProfile(result.user, { displayName: name.trim() }); await result.user.getIdToken(true); }
      await finish(result.user);
    } catch (e) { setError(e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado.' : e.message); } finally { setBusy(false); }
  }
  async function google() { setError(''); setBusy(true); try { if (!auth) throw new Error('Configurá Firebase para ingresar.'); const result = await signInWithPopup(auth, new GoogleAuthProvider()); await finish(result.user); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <div className="auth-page"><div className="auth-art"><div className="auth-art-inner"><span className="eyebrow">BIENVENIDO A ALMACÉN</span><h2>Comprar bien<br/>empieza <em>acá.</em></h2><div className="auth-graphic">🍐</div><p>Todo lo que necesitás, en un mercado hecho para vos.</p></div></div><div className="auth-panel"><div className="auth-form-wrap"><Link href="/" className="back-link">← Volver al inicio</Link><span className="eyebrow">TU CUENTA</span><h1>{mode === 'login' ? 'Qué bueno verte.' : 'Creá tu cuenta.'}</h1><p>{mode === 'login' ? 'Ingresá para seguir comprando.' : 'Empezá a disfrutar una compra más simple.'}</p><form onSubmit={submit}>{mode === 'register' && <label>Nombre<input value={name} onChange={e => setName(e.target.value)} required minLength={2} placeholder="Tu nombre"/></label>}<label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="hola@ejemplo.com"/></label><label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres"/></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark full" disabled={busy}>{busy ? 'Un momento...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'} <ArrowRight size={18}/></button></form><div className="divider">o continuá con</div><button className="button button-outline full" onClick={google} disabled={busy}><strong className="google-g">G</strong> Google</button><p className="auth-switch">{mode === 'login' ? '¿Todavía no tenés cuenta?' : '¿Ya tenés cuenta?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Registrate' : 'Ingresá'}</button></p></div></div></div>;
}
export default function AuthForm() { return <Suspense fallback={<div className="container page-space">Cargando...</div>}><Inner/></Suspense>; }
