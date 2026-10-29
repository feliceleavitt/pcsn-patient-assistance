"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";

type InvitationStatus = "not_sent" | "pending" | "accepted" | "expired" | null;

export function StagingVolunteerInvitation() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<InvitationStatus>(null);
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  async function request(action: "status" | "preflight" | "send") {
    const response = await fetch("/api/admin/staging-volunteer-invitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "The invitation request could not be completed.");
    return body as { status?: InvitationStatus; delivery?: "ready" | "not_ready" };
  }

  async function checkInvitation() {
    setChecking(true); setNotice("");
    try {
      const result = await request("preflight");
      setStatus(result.status ?? null);
      setNotice(result.delivery === "ready" ? "Email delivery is ready. Review the recipient, then send the invitation." : "Email delivery is not ready. Check the approved Resend sender configuration.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to check this invitation.");
    } finally { setChecking(false); }
  }

  async function sendInvitation(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm(`Send a single-use staging password setup invitation to ${email.trim()}?`)) return;
    setSending(true); setNotice("");
    try {
      await request("send");
      setStatus("pending");
      setNotice("Delivery was accepted. The volunteer can use the email link to create a password.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Delivery could not be confirmed. No setup link is shown here.");
    } finally { setSending(false); }
  }

  return (
    <section className="grid gap-3 rounded-md border border-pine/20 bg-white p-5 shadow-soft" aria-labelledby="invite-volunteer-heading">
      <div>
        <h2 id="invite-volunteer-heading" className="text-lg font-semibold">Invite a volunteer</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Staging only. Enter an already approved volunteer address. The recipient receives a private, single-use setup link; it is never displayed in this portal.</p>
      </div>
      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end" onSubmit={sendInvitation}>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Approved volunteer email
          <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setStatus(null); setNotice(""); }} placeholder="volunteer@example.org" required className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <Button type="button" onClick={checkInvitation} disabled={!email || checking || sending}>{checking ? "Checking…" : "Check status"}</Button>
        <Button type="submit" disabled={!email || sending || checking}>{sending ? "Sending…" : status === "expired" ? "Resend invitation" : "Send invitation"}</Button>
      </form>
      {email.trim() ? <p className="text-sm text-slate-600">Invitation recipient: <strong>{email.trim().toLowerCase()}</strong></p> : null}
      {status ? <p className="text-sm text-slate-600">Invitation status: <strong>{status === "not_sent" ? "not sent" : status}</strong></p> : null}
      {notice ? <p role="status" className="text-sm text-pine">{notice}</p> : null}
    </section>
  );
}
