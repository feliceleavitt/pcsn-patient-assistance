"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function PatientLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function getSafeNextPath() {
    const next = new URLSearchParams(window.location.search).get("next");
    if (!next || !next.startsWith("/") || next.startsWith("//")) {
      return "/patient";
    }
    return next;
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    const response = await fetch(`/api/patient/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(result?.error ?? "Unable to sign in.");
      return;
    }

    router.push(getSafeNextPath());
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-5">
      <section className="grid w-full max-w-md gap-5 rounded-md bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">
            Patient access
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {mode === "login" ? "Sign in to your profile" : "Create your profile"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create an account or sign in before starting the application. This
            lets you save your progress and come back later.
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-md bg-mist p-1 text-sm font-semibold">
          <button
            className={`h-10 rounded ${mode === "login" ? "bg-white text-pine shadow-sm" : "text-slate-600"}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`h-10 rounded ${mode === "signup" ? "bg-white text-pine shadow-sm" : "text-slate-600"}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Create account
          </button>
        </div>

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {mode === "signup" ? (
          <p className="text-sm leading-6 text-slate-600">
            Your account keeps your saved application connected to you.
          </p>
        ) : null}
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <Button onClick={submit} disabled={submitting}>
          {submitting
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </Button>
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <Link href="/intake" className="font-semibold text-pine">
            Start or continue application
          </Link>
          <Link href="/admin/login" className="text-slate-500">
            Volunteer login
          </Link>
        </div>
      </section>
    </main>
  );
}
