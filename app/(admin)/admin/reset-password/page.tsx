"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function VolunteerResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to reset your password.");
      setDone(true); setPassword(""); setConfirm(""); setToken("");
      window.history.replaceState(null, "", window.location.pathname);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="grid min-h-screen place-items-center p-5">
    <form onSubmit={submit} className="grid w-full max-w-md gap-5 rounded-md bg-white p-6 shadow-soft">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-pine">Volunteer access</p>
        <h1 className="mt-2 text-2xl font-semibold">Reset your password</h1></div>
      {done ? <p role="status" className="rounded-md bg-paper p-4 text-sm leading-6">Your password has been reset. Sign in with your new password.</p>
        : token === null ? <p role="status">Loading reset link…</p>
        : !token ? <p role="alert" className="text-sm text-coral">A reset link is required. Please request a new link below.</p>
        : <>
          <p id="password-guidance" className="text-sm leading-6 text-slate-600">Use at least 10 characters with uppercase and lowercase letters and a number.</p>
          <TextField label="New password" type="password" autoComplete="new-password" aria-describedby="password-guidance" required minLength={10} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} />
          <TextField label="Confirm password" type="password" autoComplete="new-password" required minLength={10} maxLength={256} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          {error ? <p role="alert" className="text-sm text-coral">{error}</p> : null}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Reset password"}</Button>
        </>}
      {!done ? <Link href="/admin/forgot-password" className="text-sm font-semibold text-pine underline">Request a new reset link</Link> : null}
      <Link href="/admin/login" className="text-sm font-semibold text-pine underline">Back to volunteer login</Link>
    </form>
  </main>;
}
