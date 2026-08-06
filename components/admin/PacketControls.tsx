"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { VolunteerResource } from "@/lib/resources";

type PacketRecord = {
  id: string;
  program_name: string;
  program_type: string;
  program_url: string | null;
  program_phone: string | null;
  status: string;
  signature_requested_at: string | null;
  patient_signed_at: string | null;
  fax_number: string | null;
  faxed_at: string | null;
  fax_confirmation: string | null;
  notes: string | null;
};

function resourceProgramType(resource?: VolunteerResource): "hospital" | "manufacturer" | "foundation" | "other" {
  if (!resource) return "other";
  return resource.category === "Hospital / cancer center" ? "hospital" : "manufacturer";
}

export function PacketControls({
  submissionId,
  resources,
  initialPackets,
}: {
  submissionId: string;
  resources: VolunteerResource[];
  initialPackets: PacketRecord[];
}) {
  const router = useRouter();
  const [selectedProgram, setSelectedProgram] = useState(resources[0]?.name ?? "");
  const [customProgram, setCustomProgram] = useState("");
  const [requestSignature, setRequestSignature] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [faxInputs, setFaxInputs] = useState<Record<string, { faxNumber: string; faxConfirmation: string }>>({});

  const selectedResource = useMemo(
    () => resources.find((resource) => resource.name === selectedProgram),
    [resources, selectedProgram],
  );

  async function createPacket() {
    const programName = selectedProgram === "Other" ? customProgram : selectedProgram;
    if (!programName.trim()) {
      setMessage("Choose or enter a program first.");
      return;
    }

    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/submissions/${submissionId}/packets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programName,
        programType: resourceProgramType(selectedResource),
        programUrl: selectedResource?.website ?? "",
        programPhone: selectedResource?.phone ?? "",
        requestSignature,
        notes,
      }),
    });
    setSaving(false);
    setMessage(response.ok ? "Packet created." : "Unable to create packet.");
    if (response.ok) {
      setNotes("");
      router.refresh();
    }
  }

  async function updatePacket(packetId: string, action: "request_signature" | "mark_faxed" | "mark_submitted") {
    const fax = faxInputs[packetId] ?? { faxNumber: "", faxConfirmation: "" };
    const response = await fetch(
      `/api/admin/submissions/${submissionId}/packets/${packetId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          faxNumber: fax.faxNumber,
          faxConfirmation: fax.faxConfirmation,
        }),
      },
    );
    setMessage(response.ok ? "Packet updated." : "Unable to update packet.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-4 rounded-md bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold">Assistance packets</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Build a packet for a program, request the patient&apos;s secure
          signature, download the signed PDF, and log fax/submission details.
        </p>
      </div>

      <div className="grid gap-3 rounded-md bg-paper p-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Program or assistance form</span>
          <select
            className="h-11 rounded-md border border-slate-300 bg-white px-3"
            value={selectedProgram}
            onChange={(event) => setSelectedProgram(event.target.value)}
          >
            {resources.map((resource) => (
              <option key={resource.name} value={resource.name}>
                {resource.name}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
        </label>
        {selectedProgram === "Other" ? (
          <input
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={customProgram}
            onChange={(event) => setCustomProgram(event.target.value)}
            placeholder="Program name"
          />
        ) : null}
        {selectedResource ? (
          <div className="grid gap-2 text-sm text-slate-700">
            <p>{selectedResource.focus}</p>
            <a className="font-semibold text-pine" href={selectedResource.website} target="_blank" rel="noreferrer">
              Open official form/resource
            </a>
          </div>
        ) : null}
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={requestSignature}
            onChange={(event) => setRequestSignature(event.target.checked)}
          />
          Request patient electronic signature now
        </label>
        <textarea
          className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Internal notes for this packet"
        />
        <Button onClick={createPacket} disabled={saving}>
          {saving ? "Creating..." : "Create packet"}
        </Button>
      </div>

      <div className="grid gap-3">
        {initialPackets.length ? (
          initialPackets.map((packet) => {
            const faxInput = faxInputs[packet.id] ?? {
              faxNumber: packet.fax_number ?? "",
              faxConfirmation: packet.fax_confirmation ?? "",
            };
            const isSigned = Boolean(packet.patient_signed_at);
            return (
              <div key={packet.id} className="grid gap-3 rounded-md border border-slate-200 p-4">
                <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <p className="font-semibold">{packet.program_name}</p>
                    <p className="text-sm text-slate-600">
                      Status: {packet.status.replaceAll("_", " ")}
                    </p>
                    {packet.signature_requested_at ? (
                      <p className="text-sm text-slate-600">
                        Signature requested {new Date(packet.signature_requested_at).toLocaleDateString()}
                      </p>
                    ) : null}
                    {packet.patient_signed_at ? (
                      <p className="text-sm text-pine">
                        Signed {new Date(packet.patient_signed_at).toLocaleString()}
                      </p>
                    ) : null}
                    {packet.faxed_at ? (
                      <p className="text-sm text-pine">
                        Faxed {new Date(packet.faxed_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex h-10 items-center justify-center rounded-md border border-pine/30 px-3 text-sm font-semibold text-pine"
                      href={`/api/admin/submissions/${submissionId}/packets/${packet.id}/download`}
                    >
                      Download PDF
                    </a>
                    {!isSigned ? (
                      <Button
                        variant="secondary"
                        onClick={() => updatePacket(packet.id, "request_signature")}
                      >
                        Request signature
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={faxInput.faxNumber}
                    onChange={(event) =>
                      setFaxInputs((current) => ({
                        ...current,
                        [packet.id]: { ...faxInput, faxNumber: event.target.value },
                      }))
                    }
                    placeholder="Fax number"
                  />
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={faxInput.faxConfirmation}
                    onChange={(event) =>
                      setFaxInputs((current) => ({
                        ...current,
                        [packet.id]: {
                          ...faxInput,
                          faxConfirmation: event.target.value,
                        },
                      }))
                    }
                    placeholder="Fax confirmation or notes"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => updatePacket(packet.id, "mark_faxed")}
                  >
                    Mark faxed
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => updatePacket(packet.id, "mark_submitted")}
                  >
                    Mark submitted
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">No assistance packets created yet.</p>
        )}
      </div>
      {message ? <p className="text-sm text-pine">{message}</p> : null}
    </div>
  );
}
