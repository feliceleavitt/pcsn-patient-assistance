"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CreateProgramCaseButton({ submissionId, programId }: { submissionId: string; programId: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function create() {
    setState("saving");
    const response = await fetch(`/api/admin/submissions/${submissionId}/program-cases`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programId }) });
    setState(response.ok ? "saved" : "error");
  }
  if (state === "saved") return <p className="text-sm text-pine">Program case created with this route snapshot.</p>;
  return <div className="grid gap-1"><Button variant="secondary" disabled={state === "saving"} onClick={create}>{state === "saving" ? "Creating case…" : "Create program case"}</Button>{state === "error" ? <p className="text-xs text-coral">Could not create the case. It may already exist or need refreshed review.</p> : null}</div>;
}
