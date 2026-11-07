'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseConfigured } from '@/lib/firebase-client';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState([]);
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem('almacen_cart') || '[]')); } catch { setCart([]); }
  }, []);
  useEffect(() => { localStorage.setItem('almacen_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        await fetch('/api/session', { method: 'DELETE' });
        setUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: await firebaseUser.getIdToken() }) });
        const data = await response.json();
        setUser(response.ok ? data.user : null);
      } catch { setUser(null); }
      setAuthLoading(false);
    });
  }, []);
  const addToCart = product => setCart(current => {
    const existing = current.find(item => item.productId === product.id);
    if (existing) return current.map(item => item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
    return [...current, { productId: product.id, name: product.name, price: product.price, unit: product.unit, category: product.category, quantity: 1, stock: product.stock }];
  });
  const setQuantity = (id, quantity) => setCart(current => current.map(item => item.productId === id ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) } : item));
  const removeFromCart = id => setCart(current => current.filter(item => item.productId !== id));
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const value = useMemo(() => ({ user, setUser, authLoading, cart, setCart, addToCart, setQuantity, removeFromCart, totalItems, total, firebaseConfigured }), [user, authLoading, cart, totalItems, total]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { return useContext(StoreContext); }
