"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export function SignatureRequestPanel({
  packetId,
  patientName,
  programName,
  signedAt,
}: {
  packetId: string;
  patientName: string;
  programName: string;
  signedAt?: string | null;
}) {
  const router = useRouter();
  const [signature, setSignature] = useState(patientName);
  const [acknowledgment, setAcknowledgment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(Boolean(signedAt));

  async function submit() {
    setError("");
    setSubmitting(true);
    const response = await fetch(`/api/patient/signatures/${packetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, acknowledgment }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(result?.error ?? "Unable to save signature.");
      return;
    }

    setSigned(true);
    router.refresh();
  }

  if (signed) {
    return (
      <section className="grid gap-4 rounded-md bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-pine">
          Signature complete
        </p>
        <h1 className="text-3xl font-semibold">Thank you. Your signature was saved.</h1>
        <p className="text-sm leading-6 text-slate-600">
          PCSN can now prepare this packet for submission to {programName}. A
          volunteer will contact you if anything else is needed.
        </p>
        <Button onClick={() => router.push("/patient")}>Return to profile</Button>
      </section>
    );
  }

  return (
    <section className="grid gap-5 rounded-md bg-white p-6 shadow-soft">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-pine">
          Patient signature request
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Review and sign</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          PCSN is preparing paperwork for {programName}. Your typed name below
          will be saved as your electronic signature for this assistance packet.
        </p>
      </div>

      <div className="rounded-md border border-pine/20 bg-pine/5 p-4 text-sm leading-6 text-slate-700">
        I authorize Phoenix Cancer Support Network to use the information I
        provided to help prepare and submit assistance paperwork for this
        program. I understand PCSN cannot guarantee approval, funding,
        medication access, debt reduction, or any other benefit.
      </div>

      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          className="mt-1"
          type="checkbox"
          checked={acknowledgment}
          onChange={(event) => setAcknowledgment(event.target.checked)}
        />
        <span>
          I reviewed this request and agree to sign electronically for this PCSN
          assistance packet.
        </span>
      </label>

      <TextField
        required
        label="Electronic signature"
        value={signature}
        onChange={(event) => setSignature(event.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={submitting || !acknowledgment || !signature.trim()}
          onClick={submit}
        >
          {submitting ? "Saving..." : "Sign packet"}
        </Button>
        {error ? <span className="text-sm text-coral">{error}</span> : null}
      </div>
    </section>
  );
}
