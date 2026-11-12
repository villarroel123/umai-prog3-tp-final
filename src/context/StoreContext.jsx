'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseConfigured } from '@/lib/firebase-client';
import { establishSession } from '@/lib/client-session';
const StoreContext = createContext(null);
export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const hadFirebaseUser = useRef(false);
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) { if (hadFirebaseUser.current) await fetch('/api/session', { method: 'DELETE' }).catch(() => {}); hadFirebaseUser.current = false; setUser(null); setAuthLoading(false); return; }
      hadFirebaseUser.current = true;
      try { setUser(await establishSession(firebaseUser)); }
      catch { setUser(null); }
      setAuthLoading(false);
    });
  }, []);
  const value = useMemo(() => ({ user, setUser, authLoading, firebaseConfigured }), [user, authLoading]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { return useContext(StoreContext); }
