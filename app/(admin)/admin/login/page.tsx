"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      mustChangePassword?: boolean;
    } | null;
    if (!response.ok) {
      setError(result?.error ?? "Login failed");
      return;
    }
    router.push(result?.mustChangePassword ? "/admin/change-password" : "/admin");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="grid w-full max-w-sm gap-5 rounded-md bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">
            Staff access
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Volunteer login</h1>
        </div>
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <Button onClick={submit}>Sign in</Button>
        <p className="rounded-md bg-paper p-3 text-sm text-slate-600">
          Volunteer access is limited to approved Phoenix Cancer Support Network
          accounts.
        </p>
      </div>
    </main>
  );
}
