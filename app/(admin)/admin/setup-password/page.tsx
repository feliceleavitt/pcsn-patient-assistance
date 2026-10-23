"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function StagingVolunteerPasswordSetupPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/staging-password-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Unable to save this password.");
      setDone(true);
      setPassword("");
      setConfirmPassword("");
      setToken("");
      window.history.replaceState(null, "", window.location.pathname);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <form onSubmit={submit} className="grid w-full max-w-md gap-5 rounded-md bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">Staging volunteer access</p>
          <h1 className="mt-2 text-2xl font-semibold">Set your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This single-use setup page is for the staging volunteer account only.
          </p>
        </div>
        {done ? <p role="status" className="rounded-md bg-paper p-4 text-sm leading-6">Your password has been saved. You can now sign in to the volunteer dashboard.</p>
          : token === null ? <p role="status">Loading secure setup…</p>
          : !token ? <p role="alert" className="text-sm text-coral">This password setup link is required and may have expired.</p>
          : <>
            <p id="password-guidance" className="text-sm leading-6 text-slate-600">Use at least 10 characters with uppercase and lowercase letters and a number.</p>
            <TextField label="New password" type="password" autoComplete="new-password" aria-describedby="password-guidance" required minLength={10} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} />
            <TextField label="Confirm password" type="password" autoComplete="new-password" required minLength={10} maxLength={256} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            {error ? <p role="alert" className="text-sm text-coral">{error}</p> : null}
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
          </>}
        <Link href="/admin/login" className="text-sm font-semibold text-pine underline">Back to volunteer login</Link>
      </form>
    </main>
  );
}
