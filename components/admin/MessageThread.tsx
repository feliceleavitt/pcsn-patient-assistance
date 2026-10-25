"use client";

import { useState } from "react";

type Message = { id: string; sender_kind: "patient" | "volunteer"; body: string; created_at: string };

export function MessageThread({ submissionId, initialMessages }: { submissionId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function send() {
    if (!body.trim()) return;
    setSaving(true); setError("");
    const response = await fetch(`/api/admin/submissions/${submissionId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    const result = await response.json().catch(() => null) as { message?: Message; error?: string } | null;
    setSaving(false);
    if (!response.ok || !result?.message) { setError(result?.error ?? "Unable to send message."); return; }
    setMessages((current) => [...current, result.message!]); setBody("");
  }
  return <section className="grid gap-3 rounded-md bg-white p-5 shadow-soft"><h2 className="text-lg font-semibold">Patient messages</h2>{messages.length ? <div className="grid gap-2">{messages.map((message) => <div key={message.id} className="rounded-md bg-paper p-3 text-sm"><p className="font-medium capitalize">{message.sender_kind}</p><p>{message.body}</p><p className="mt-1 text-xs text-slate-500">{new Date(message.created_at).toLocaleString()}</p></div>)}</div> : <p className="text-sm text-slate-500">No patient messages yet.</p>}<label className="grid gap-1 text-sm font-medium">Reply to patient<textarea className="min-h-24 rounded-md border border-slate-300 p-2 font-normal" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} /></label><button type="button" onClick={send} disabled={saving || !body.trim()} className="w-fit rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Sending…" : "Send reply"}</button>{error ? <p className="text-sm text-coral">{error}</p> : null}</section>;
}
