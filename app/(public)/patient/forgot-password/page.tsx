"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function ForgotPatientPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/patient/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(result?.error ?? "Unable to send the recovery email.");
        return;
      }
      setSent(true);
    } catch {
      setError("Unable to send the recovery email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-5">
      <section className="grid w-full max-w-md gap-5 rounded-md bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">
            Patient access
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter the email address you used to start your application.
          </p>
        </div>

        {sent ? (
          <div className="grid gap-4">
            <p className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-700">
              If an account exists for that email address, a password reset link
              is on its way. Check your spam folder if it does not arrive soon.
            </p>
            <Link href="/patient/login" className="font-semibold text-pine">
              Return to patient sign in
            </Link>
          </div>
        ) : (
          <>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !submitting) void submit();
              }}
            />
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Sending..." : "Send password reset link"}
            </Button>
            <Link href="/patient/login" className="text-sm font-semibold text-pine">
              Back to patient sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
