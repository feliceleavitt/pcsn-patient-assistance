"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function CreateProgramCaseButton({ submissionId, programId }: { submissionId: string; programId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function create() {
    setState("saving");
    const response = await fetch(`/api/admin/submissions/${submissionId}/program-cases`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programId }) });
    setState(response.ok ? "saved" : "error");
    if (response.ok) router.refresh();
  }
  if (state === "saved") return <p role="status" className="text-sm text-pine">Tracking record created. Open My tasks &amp; applications to record progress.</p>;
  return <div className="grid gap-1"><Button variant="secondary" disabled={state === "saving"} onClick={create}>{state === "saving" ? "Starting…" : "Start working on this program"}</Button>{state === "error" ? <p className="text-xs text-coral">A tracking record may already exist. Refresh this page and check My tasks &amp; applications.</p> : null}</div>;
}
