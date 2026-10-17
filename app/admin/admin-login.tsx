"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        throw new Error(payload.error ?? "Admin login failed.");
      }
      setKey("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card">
      <p className="eyebrow">RESTRICTED AREA</p>
      <h1>Admin access</h1>
      {configured ? (
        <form className="question" onSubmit={login}>
          <label htmlFor="admin-key">Admin key</label>
          <input
            id="admin-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            required
          />
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={busy || !key}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      ) : (
        <p>Admin access is disabled. Configure <code>ADMIN_API_KEY</code> in your local environment.</p>
      )}
    </section>
  );
}
