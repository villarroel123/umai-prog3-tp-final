'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseConfigured } from '@/lib/firebase-client';
const StoreContext = createContext(null);
export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) { await fetch('/api/session', { method: 'DELETE' }).catch(() => {}); setUser(null); setAuthLoading(false); return; }
      try {
        const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: await firebaseUser.getIdToken() }) });
        const data = await response.json(); setUser(response.ok ? data.user : null);
      } catch { setUser(null); }
      setAuthLoading(false);
    });
  }, []);
  const value = useMemo(() => ({ user, setUser, authLoading, firebaseConfigured }), [user, authLoading]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { return useContext(StoreContext); }
