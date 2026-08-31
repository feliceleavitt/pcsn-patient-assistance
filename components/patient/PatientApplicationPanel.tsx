"use client";

import { useState } from "react";
import Link from "next/link";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";

type PatientApplication = {
  status: string;
  createdAt: string;
  missingDocuments: string[];
  patient: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string;
    postal_code: string;
  };
  documents: Array<{
    id: string;
    originalFilename: string;
    documentType: string;
    uploadedAt: string;
  }>;
  signatureRequests: Array<{
    id: string;
    programName: string;
    status: string;
    signatureRequestedAt: string | null;
    patientSignedAt: string | null;
  }>;
};

const uploadOptions = [
  ["insurance_card_front", "Insurance card, front"],
  ["insurance_card_back", "Insurance card, back"],
  ["photo_id", "Photo ID"],
  ["medical_bill", "Medical bill"],
  ["prior_authorization_denial", "Prior authorization denial"],
  ["appeal_denial", "Appeal denial"],
  ["eob", "Explanation of Benefits/EOB"],
  ["w2", "Most recent W2"],
  ["tax_return", "Most recent tax return"],
  ["paystub", "Two most recent pay stubs"],
  ["bank_statement", "Two most recent bank statements"],
  ["benefit_letter", "Benefit award letter"],
  ["proof_of_income", "Proof of household income"],
  ["other_documents", "Other documents"],
];

export function PatientApplicationPanel({
  application,
}: {
  application: PatientApplication;
}) {
  const [contact, setContact] = useState({
    phone: application.patient.phone,
    email: application.patient.email,
    addressLine1: application.patient.address_line_1,
    addressLine2: application.patient.address_line_2 ?? "",
    city: application.patient.city,
    state: application.patient.state,
    postalCode: application.patient.postal_code,
  });
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [saving, setSaving] = useState(false);
  const [volunteerAccessConsent, setVolunteerAccessConsent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setSaved(false);
    if (!volunteerAccessConsent) {
      setError(
        "Please consent to volunteer access and contact before saving your updates.",
      );
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.append(
      "payload",
      JSON.stringify({ ...contact, message, volunteerAccessConsent }),
    );
    Object.entries(files).forEach(([documentType, selectedFiles]) => {
      selectedFiles.forEach((file) => {
        formData.append(`document:${documentType}`, file);
      });
    });

    const response = await fetch("/api/patient/application", {
      method: "PATCH",
      body: formData,
    });
    setSaving(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(result?.error ?? "Unable to save updates.");
      return;
    }

    setSaved(true);
    setVolunteerAccessConsent(false);
    setMessage("");
    setFiles({});
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-md bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pine">
              Current request
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {application.status.replaceAll("_", " ")}
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Submitted {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>

        {application.missingDocuments.length ? (
          <div className="rounded-md border border-coral/30 bg-coral/5 p-4">
            <h3 className="font-semibold text-ink">Items still needed</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
              {application.missingDocuments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-md bg-mist p-4 text-sm text-slate-700">
            No missing documents are listed right now.
          </p>
        )}
      </section>

      <section className="grid gap-4 rounded-md bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Contact information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Phone"
            value={contact.phone}
            onChange={(event) =>
              setContact((current) => ({ ...current, phone: event.target.value }))
            }
          />
          <TextField
            label="Email"
            type="email"
            value={contact.email}
            onChange={(event) =>
              setContact((current) => ({ ...current, email: event.target.value }))
            }
          />
          <TextField
            label="Address line 1"
            value={contact.addressLine1}
            onChange={(event) =>
              setContact((current) => ({
                ...current,
                addressLine1: event.target.value,
              }))
            }
          />
          <TextField
            label="Address line 2"
            value={contact.addressLine2}
            onChange={(event) =>
              setContact((current) => ({
                ...current,
                addressLine2: event.target.value,
              }))
            }
          />
          <TextField
            label="City"
            value={contact.city}
            onChange={(event) =>
              setContact((current) => ({ ...current, city: event.target.value }))
            }
          />
          <TextField
            label="State"
            value={contact.state}
            onChange={(event) =>
              setContact((current) => ({ ...current, state: event.target.value }))
            }
          />
          <TextField
            label="Postal code"
            value={contact.postalCode}
            onChange={(event) =>
              setContact((current) => ({
                ...current,
                postalCode: event.target.value,
              }))
            }
          />
        </div>
      </section>

      {application.signatureRequests.length ? (
        <section className="grid gap-4 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Documents to sign</h2>
          <div className="grid gap-3">
            {application.signatureRequests.map((request) => {
              const needsSignature = request.status === "signature_requested";
              return (
                <div
                  key={request.id}
                  className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p className="font-medium">{request.programName}</p>
                    <p className="text-sm text-slate-600">
                      {request.patientSignedAt
                        ? `Signed ${new Date(request.patientSignedAt).toLocaleDateString()}`
                        : needsSignature
                          ? "Waiting for your signature"
                          : request.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  {needsSignature ? (
                    <Link
                      href={`/patient/signatures/${request.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-pine px-4 text-sm font-semibold text-white"
                    >
                      Review and sign
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 rounded-md bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Upload missing documents</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {uploadOptions.map(([documentType, label]) => {
            const selectedCount = files[documentType]?.length ?? 0;
            return (
              <label
                key={documentType}
                className="grid min-h-32 cursor-pointer place-items-center rounded-md border border-dashed border-slate-400 bg-white p-4 text-center"
              >
                <input
                  className="sr-only"
                  type="file"
                  multiple
                  onChange={(event) =>
                    setFiles((current) => ({
                      ...current,
                      [documentType]: Array.from(event.target.files ?? []),
                    }))
                  }
                />
                <span className="grid gap-2">
                  <FileUp className="mx-auto text-pine" />
                  <span className="font-medium">{label}</span>
                  <span className="text-sm text-slate-500">
                    {selectedCount
                      ? `${selectedCount} file(s) selected`
                      : "Upload PDF, JPG, or PNG"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <TextAreaField
          label="Message for the volunteer"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <label className="flex items-start gap-3 rounded-md border border-pine/30 bg-pine/5 p-4 text-sm leading-6">
          <input
            className="mt-1"
            type="checkbox"
            checked={volunteerAccessConsent}
            onChange={(event) => setVolunteerAccessConsent(event.target.checked)}
          />
          <span>
            I consent to Phoenix Cancer Support Network volunteers accessing
            the application information and updates I have provided up to this
            point, and I give permission for volunteers to contact me to offer
            assistance with my application.<span className="ml-1 text-coral">*</span>
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={saving || !volunteerAccessConsent}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {saved ? <span className="text-sm text-pine">Updates saved.</span> : null}
          {error ? <span className="text-sm text-coral">{error}</span> : null}
        </div>
      </section>

      <section className="grid gap-3 rounded-md bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Uploaded documents</h2>
        {application.documents.length ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {application.documents.map((document) => (
              <li key={document.id}>
                {document.documentType.replaceAll("_", " ")}: {" "}
                {document.originalFilename}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        )}
      </section>
    </div>
  );
}
