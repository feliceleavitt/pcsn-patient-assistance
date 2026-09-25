"use client";
import { useState } from "react";
import {useRouter} from "next/navigation";
import { caseStatuses } from "@/lib/assistance/cases";
import { TextField, TextAreaField } from "@/components/ui/Field";
export function ProgramCaseEditor({
  submissionId,
  programId,
  initial,
}: {
  submissionId: string;
  programId: string;
  initial?: Record<string, unknown>;
}) {
  const router = useRouter();
  const defaults = {
    programId,
    revision: 0,
    status: "preparing",
    assigned_to: "",
    priority: "normal",
    next_action: "",
    missing_documents: "",
    follow_up_date: "",
    last_contact_date: "",
    submitted_date: "",
    benefits_end_date: "",
  };
  const [value, setValue] = useState(() =>
    Object.fromEntries(
      Object.entries(defaults).map(([k, v]) => [k, initial?.[k] ?? v]),
    ),
  );
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setValue((c) => ({ ...c, [k]: v }));
  return (
    <details className="rounded-md border p-4">
      <summary className="cursor-pointer font-semibold">
        Program case: {String(value.status).replaceAll("_", " ")} ·{" "}
        {String(value.assigned_to) || "Unassigned"}
      </summary>
      <p className="my-3 text-sm">
        External application progress is separate from screening and the overall
        PCSN status. Record only actions that actually happened.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          Progress
          <select
            className="min-h-11 border p-2"
            value={String(value.status)}
            onChange={(e) => set("status", e.target.value)}
          >
            {caseStatuses.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          Priority
          <select
            className="min-h-11 border p-2"
            value={String(value.priority)}
            onChange={(e) => set("priority", e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <TextField
          label="Assigned volunteer (name or email)"
          value={String(value.assigned_to)}
          onChange={(e) => set("assigned_to", e.target.value)}
        />
        {[
          ["follow_up_date", "Follow-up date"],
          ["last_contact_date", "Last patient contact"],
          ["submitted_date", "External submission date"],
          ["benefits_end_date", "Benefits end date"],
        ].map(([k, label]) => (
          <TextField
            key={k}
            label={label}
            type="date"
            value={String(value[k])}
            onChange={(e) => set(k, e.target.value)}
          />
        ))}
      </div>
      <TextAreaField
        label="Next action"
        value={String(value.next_action)}
        onChange={(e) => set("next_action", e.target.value)}
      />
      <TextAreaField
        label="Missing documents (one per line)"
        value={String(value.missing_documents)}
        onChange={(e) => set("missing_documents", e.target.value)}
      />
      <button
        type="button"
        className="mt-3 min-h-11 rounded bg-pine px-4 text-white"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch(
              `/api/admin/submissions/${submissionId}/program-cases`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(value),
              },
            );
            const body = await response.json();
            if (!response.ok) throw Error(body.error);
            setValue((c) => ({ ...c, revision: body.case.revision }));
            setMessage("Program case saved.");
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Unable to save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Save program case"}
      </button>
      <p role="status">{message}</p>
    </details>
  );
}
