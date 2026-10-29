"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function StagingVolunteerInvitation() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendInvitation() {
    if (!window.confirm("Send the configured staging volunteer a single-use password setup email?")) return;
    setState("sending");
    try {
      const response = await fetch("/api/admin/staging-volunteer-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Delivery could not be confirmed.");
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <section className="grid gap-3 rounded-md border border-pine/20 bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold">Staging volunteer invitation</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Send the configured test volunteer a single-use password setup email. The link is never displayed in this portal.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={sendInvitation} disabled={state === "sending" || state === "sent"}>{state === "sending" ? "Sending…" : state === "sent" ? "Invitation sent" : "Send setup invitation"}</Button>
        {state === "sent" ? <p role="status" className="text-sm text-pine">Delivery was accepted. The recipient can create a password from the email.</p> : null}
        {state === "error" ? <p role="alert" className="text-sm text-coral">Delivery could not be confirmed. No setup link is shown here.</p> : null}
      </div>
    </section>
  );
}
