"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { createBrowserClient } from "@/lib/supabase/browser";

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

export default function ResetPatientPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);

  useEffect(() => {
    const client = createBrowserClient();
    setSupabase(client);
    void client.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit() {
    setError("");
    if (!supabase) {
      setError("The reset page is still loading. Please try again.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError("This reset link is invalid or expired. Request a new link.");
      return;
    }
    await supabase.auth.signOut();
    setComplete(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-5">
      <section className="grid w-full max-w-md gap-5 rounded-md bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">
            Patient access
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Choose a new password</h1>
        </div>

        {complete ? (
          <div className="grid gap-4">
            <p className="rounded-md bg-mist p-4 text-sm text-slate-700">
              Your password has been updated.
            </p>
            <Link href="/patient/login" className="font-semibold text-pine">
              Sign in to continue your application
            </Link>
          </div>
        ) : ready ? (
          <>
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Updating..." : "Update password"}
            </Button>
          </>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-600">
              This reset link is invalid or expired.
            </p>
            <Link href="/patient/forgot-password" className="font-semibold text-pine">
              Request a new reset link
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
