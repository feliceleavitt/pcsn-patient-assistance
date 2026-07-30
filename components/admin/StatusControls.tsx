"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ApplicationStatus } from "@/lib/types";

const statuses: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "missing_documents",
  "approved",
  "denied",
  "renewal_needed",
];

export function StatusControls({
  submissionId,
  initialStatus,
  initialMissingDocuments,
}: {
  submissionId: string;
  initialStatus: ApplicationStatus;
  initialMissingDocuments: string[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [missingDocuments, setMissingDocuments] = useState(
    initialMissingDocuments.join(", "),
  );
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    const response = await fetch(`/api/admin/submissions/${submissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        missingDocuments: missingDocuments
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        note,
      }),
    });
    setSaved(response.ok);
    if (response.ok) setNote("");
  }

  return (
    <div className="grid gap-4 rounded-md bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold">Review actions</h2>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Application status</span>
        <select
          className="h-11 rounded-md border border-slate-300 bg-white px-3"
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Missing documents</span>
        <input
          className="h-11 rounded-md border border-slate-300 bg-white px-3"
          value={missingDocuments}
          onChange={(e) => setMissingDocuments(e.target.value)}
          placeholder="Proof of income, insurance card"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Add note</span>
        <textarea
          className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-3"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="flex items-center gap-3">
        <Button onClick={save}>Save changes</Button>
        {saved ? <span className="text-sm text-pine">Saved</span> : null}
      </div>
    </div>
  );
}
