let pendingSession = null;

export async function establishSession(firebaseUser) {
  if (pendingSession?.uid === firebaseUser.uid) return pendingSession.promise;
  const promise = (async () => {
    const idToken = await firebaseUser.getIdToken(true);
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo iniciar la sesión.');
    return data.user;
  })();
  pendingSession = { uid: firebaseUser.uid, promise };
  try { return await promise; }
  finally { if (pendingSession?.promise === promise) pendingSession = null; }
}

