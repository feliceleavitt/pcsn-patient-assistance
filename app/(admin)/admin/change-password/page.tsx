"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(result?.error ?? "Unable to update password.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="grid w-full max-w-md gap-5 rounded-md bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">
            Volunteer security
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Create your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Please choose your own password before using the volunteer dashboard.
          </p>
        </div>
        <TextField
          label="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TextField
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <p className="text-sm leading-6 text-slate-600">
          Use at least 10 characters with uppercase and lowercase letters and a
          number.
        </p>
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Saving..." : "Save password"}
        </Button>
      </div>
    </main>
  );
}
