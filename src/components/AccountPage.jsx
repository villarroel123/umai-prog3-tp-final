'use client';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ArrowRight, LogOut, ReceiptText, Settings2, Store, UserRound } from 'lucide-react';
import { auth } from '@/lib/firebase-client';

export default function AccountPage({ initialUser }) {
  const router = useRouter();
  async function logout() { if (auth) await signOut(auth); await fetch('/api/session', { method: 'DELETE' }); router.push('/'); router.refresh(); }
  return <div className="inner-page"><div className="page-top"><div><span className="eyebrow">MI CUENTA</span><h1>Hola, {initialUser.name.split(' ')[0]}<span className="accent">.</span></h1><p>Tu perfil y tus accesos en caja.</p></div></div><div className="account-grid"><div className="account-card"><UserRound size={24}/><span className="eyebrow">PERFIL</span><h2>{initialUser.name}</h2><p>{initialUser.email}</p><span className="role-tag">{initialUser.role === 'admin' ? 'Administrador' : 'Propietario'}</span></div><Link className="account-card account-link" href="/ventas"><ReceiptText size={24}/><span className="eyebrow">HISTORIAL</span><h2>Ventas registradas</h2><p>Revisá los cobros y su detalle.</p><ArrowRight className="account-arrow" size={20}/></Link><Link className="account-card account-link" href={initialUser.role === 'admin' ? '/admin' : '/panel'}><Store size={24}/><span className="eyebrow">GESTIÓN</span><h2>{initialUser.role === 'admin' ? 'Administración' : 'Mi negocio'}</h2><p>{initialUser.role === 'admin' ? 'Consultá usuarios y actividad.' : 'Abrí la caja y registrá ventas.'}</p><ArrowRight className="account-arrow" size={20}/></Link>{initialUser.role === 'owner' && <Link className="account-card account-link" href="/panel/configuracion"><Settings2 size={24}/><span className="eyebrow">EQUIPO</span><h2>Configuración</h2><p>Editá el nombre e invitá propietarios.</p><ArrowRight className="account-arrow" size={20}/></Link>}</div><button className="logout-button" onClick={logout}><LogOut size={17}/> Cerrar sesión</button></div>;
}