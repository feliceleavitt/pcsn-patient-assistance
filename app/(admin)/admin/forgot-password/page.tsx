"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function VolunteerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to request a reset. Please try again.");
      setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="grid min-h-screen place-items-center p-5">
    <form onSubmit={submit} className="grid w-full max-w-md gap-5 rounded-md bg-white p-6 shadow-soft">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-pine">Volunteer access</p>
        <h1 className="mt-2 text-2xl font-semibold">Forgot your password?</h1></div>
      {sent ? <div role="status" className="rounded-md bg-paper p-4 text-sm leading-6">
        If this email is approved for volunteer access, you will receive a reset link shortly. Check your inbox and spam folder. The link expires within 30 minutes.
        If it does not arrive, contact your PCSN portal administrator.
      </div> : <>
        <p className="text-sm leading-6 text-slate-600">Enter your approved volunteer email address. We’ll email you a link to choose a new password.</p>
        <TextField label="Email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
        {error ? <p role="alert" className="text-sm text-coral">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
      </>}
      <Link href="/admin/login" className="text-sm font-semibold text-pine underline">Back to volunteer login</Link>
    </form>
  </main>;
}
