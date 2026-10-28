"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type ProgramCase = {
  id: string;
  program_id: string;
  route_action_type: string | null;
  match_state: string | null;
  verification_status: string | null;
  source_url: string | null;
  assigned_to: string | null;
  application_deadline: string | null;
  submitted_at: string | null;
  follow_up_at: string | null;
  reminder_status: "not_set" | "scheduled" | "completed" | "dismissed";
  application_status: "draft" | "preparing" | "submitted" | "pending_decision" | "approved" | "denied" | "closed";
  decision_details: string | null;
  decision_at: string | null;
  internal_notes: string;
};

function dateValue(value: string | null) { return value ? value.slice(0, 10) : ""; }

export function ProgramCaseControls({ submissionId, initialCases }: { submissionId: string; initialCases: ProgramCase[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, ProgramCase>>(() => Object.fromEntries(initialCases.map((item) => [item.id, item])));

  async function save(caseId: string, assignToMe = false) {
    const current = values[caseId];
    if (!current) return;
    setSavingId(caseId); setMessage("");
    const response = await fetch(`/api/admin/submissions/${submissionId}/program-cases/${caseId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignToMe,
        applicationDeadline: current.application_deadline || null,
        submittedAt: current.submitted_at || null,
        followUpAt: current.follow_up_at || null,
        reminderStatus: current.reminder_status,
        applicationStatus: current.application_status,
        decisionDetails: current.decision_details || null,
        decisionAt: current.decision_at || null,
        internalNotes: current.internal_notes,
      }),
    });
    const result = await response.json().catch(() => null) as { programCase?: Partial<ProgramCase>; error?: string } | null;
    setSavingId(null);
    if (response.ok) {
      if (result?.programCase) update(caseId, result.programCase);
      setMessage(assignToMe ? "You are now assigned to this application. The assignment has been saved." : "Changes saved. This application will keep these details after refresh.");
      router.refresh();
    } else setMessage(result?.error ?? "Changes could not be saved. Check the fields and try again.");
  }

  function update(caseId: string, patch: Partial<ProgramCase>) { setValues((previous) => ({ ...previous, [caseId]: { ...previous[caseId], ...patch } })); }
  if (!initialCases.length) return null;
  return <section className="grid gap-4 rounded-md bg-white p-5 shadow-soft"><div><h2 className="text-lg font-semibold">My tasks & active applications</h2><p className="mt-1 text-sm text-slate-600">Track work here after reviewing a program. Saving records internal progress only; it never contacts an assistance organization.</p></div>{initialCases.map((item) => { const current = values[item.id] ?? item; return <div key={item.id} className="grid gap-3 rounded-md border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.program_id}</p><p className="text-sm text-slate-600">Current status: {current.application_status.replaceAll("_", " ")} · {item.match_state?.replaceAll("_", " ") ?? "review pending"}</p><p className="text-xs text-slate-600">{current.assigned_to ? `Responsible volunteer: ${current.assigned_to}` : "No volunteer assigned yet."}</p>{item.source_url ? <a className="text-sm text-pine underline" target="_blank" rel="noreferrer" href={item.source_url}>Review official program information</a> : null}</div><Button variant="secondary" onClick={() => save(item.id, true)} disabled={savingId === item.id || Boolean(current.assigned_to)}>{current.assigned_to ? `Assigned to ${current.assigned_to}` : "Assign this to me"}</Button></div><div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm">Current status<select className="h-10 rounded-md border border-slate-300 px-3" value={current.application_status} onChange={(e) => update(item.id, { application_status: e.target.value as ProgramCase["application_status"] })}>{["draft","preparing","submitted","pending_decision","approved","denied","closed"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="grid gap-1 text-sm">Follow-up reminder<select className="h-10 rounded-md border border-slate-300 px-3" value={current.reminder_status} onChange={(e) => update(item.id, { reminder_status: e.target.value as ProgramCase["reminder_status"] })}>{["not_set","scheduled","completed","dismissed"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="grid gap-1 text-sm">Application deadline<input className="h-10 rounded-md border border-slate-300 px-3" type="date" value={dateValue(current.application_deadline)} onChange={(e) => update(item.id, { application_deadline: e.target.value || null })} /></label><label className="grid gap-1 text-sm">Follow-up date<input className="h-10 rounded-md border border-slate-300 px-3" type="date" value={dateValue(current.follow_up_at)} onChange={(e) => update(item.id, { follow_up_at: e.target.value || null })} /></label><label className="grid gap-1 text-sm">When the application was submitted<input className="h-10 rounded-md border border-slate-300 px-3" type="datetime-local" value={current.submitted_at ? current.submitted_at.slice(0,16) : ""} onChange={(e) => update(item.id, { submitted_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label><label className="grid gap-1 text-sm">Decision date<input className="h-10 rounded-md border border-slate-300 px-3" type="datetime-local" value={current.decision_at ? current.decision_at.slice(0,16) : ""} onChange={(e) => update(item.id, { decision_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label></div><label className="grid gap-1 text-sm">Approval or denial details<textarea className="min-h-20 rounded-md border border-slate-300 px-3 py-2" value={current.decision_details ?? ""} onChange={(e) => update(item.id, { decision_details: e.target.value })} /></label><label className="grid gap-1 text-sm">Internal notes (not visible to the patient)<textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2" value={current.internal_notes ?? ""} onChange={(e) => update(item.id, { internal_notes: e.target.value })} /></label><div><Button onClick={() => save(item.id)} disabled={savingId === item.id}>{savingId === item.id ? "Saving…" : "Save progress"}</Button></div></div>; })}{message ? <p role="status" className="rounded-md bg-paper p-3 text-sm text-pine">{message}</p> : null}</section>;
}
