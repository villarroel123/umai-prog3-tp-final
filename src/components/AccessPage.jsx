"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { establishSession } from "@/lib/client-session";
import { landingFor } from "@/lib/roles";

export default function AccessPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!auth) throw new Error("Configurá Firebase en .env.local para ingresar.");
      const result = await signInWithEmailAndPassword(auth, username.trim(), password);
      const user = await establishSession(result.user);
      window.location.assign(landingFor(user?.role));
    } catch (reason) {
      setError(
        reason.code === "auth/invalid-credential"
          ? "Usuario o clave incorrectos."
          : reason.message || "No se pudo ingresar. Intentá nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-labelledby="access-title">
        <div className="access-card-top">
          <span className="access-mark"><LockKeyhole size={19} /></span>
          <span>ZETA</span>

        </div>
        <div className="access-card-content">

          <h1 id="access-title">Ingresar al sistema</h1>

          <form onSubmit={submit}>
            <label htmlFor="access-username">Usuario</label>
            <input
              id="access-username"
              type="email"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="Tu correo electrónico"
              required
            />
            <label htmlFor="access-password">Clave</label>
            <input
              id="access-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              required
            />
            {error && <p className="access-error" role="alert">{error}</p>}
            <button className="button-primary" type="submit" disabled={busy}>
              {busy ? "Ingresando..." : "Ingresar"}
              <ArrowRight size={17} />
            </button>
          </form>
          <Link className="access-back" href="/login">Ingresar con Google o como cajero</Link>
          <Link className="access-back" href="/">Volver al inicio</Link>
        </div>
      </section>
    </main>
  );
}
