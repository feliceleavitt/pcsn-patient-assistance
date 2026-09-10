"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";

type Props = {
  submissionId: string;
  initial: {
    firstName: string; lastName: string; dateOfBirth: string; phone: string; email: string;
    cancerType: string; cancerStage: string; diagnosisDate: string; treatmentPlan: string;
    medications: string; pharmacyName: string; providerName: string; providerNpi: string;
    insuranceCompany: string; memberId: string; pcn: string; groupId: string; policyHolder: string;
    monthlyIncome: string; annualIncome: string;
  };
};

export function ApplicationEditor({ submissionId, initial }: Props) {
  const [values, setValues] = useState(initial);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  async function save() {
    setSaving(true); setMessage("");
    const body = new FormData();
    body.append("payload", JSON.stringify(values));
    files.forEach((file) => body.append("documents", file));
    const response = await fetch(`/api/admin/submissions/${submissionId}`, { method: "PATCH", body });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) { setMessage(result?.error ?? "Unable to save changes."); return; }
    setMessage("Application updated.");
    window.location.reload();
  }

  return <details className="rounded-md bg-white p-5 shadow-soft">
    <summary className="cursor-pointer text-lg font-semibold">Edit application and upload documents</summary>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <TextField label="First name" value={values.firstName} onChange={(e) => update("firstName", e.target.value)} />
      <TextField label="Last name" value={values.lastName} onChange={(e) => update("lastName", e.target.value)} />
      <TextField label="Date of birth" type="date" value={values.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
      <TextField label="Phone" value={values.phone} onChange={(e) => update("phone", e.target.value)} />
      <TextField label="Email" type="email" value={values.email} onChange={(e) => update("email", e.target.value)} />
      <TextField label="Cancer type" value={values.cancerType} onChange={(e) => update("cancerType", e.target.value)} />
      <TextField label="Cancer stage" value={values.cancerStage} onChange={(e) => update("cancerStage", e.target.value)} />
      <TextField label="Diagnosis date" type="date" value={values.diagnosisDate} onChange={(e) => update("diagnosisDate", e.target.value)} />
      <div className="md:col-span-2"><TextAreaField label="Treatment details" value={values.treatmentPlan} onChange={(e) => update("treatmentPlan", e.target.value)} /></div>
      <div className="md:col-span-2"><TextAreaField label="Medication list" value={values.medications} onChange={(e) => update("medications", e.target.value)} /></div>
      <TextField label="Preferred pharmacy" value={values.pharmacyName} onChange={(e) => update("pharmacyName", e.target.value)} />
      <TextField label="Provider name" value={values.providerName} onChange={(e) => update("providerName", e.target.value)} />
      <TextField label="Provider NPI" value={values.providerNpi} onChange={(e) => update("providerNpi", e.target.value)} />
      <TextField label="Insurance company" value={values.insuranceCompany} onChange={(e) => update("insuranceCompany", e.target.value)} />
      <TextField label="Member ID" value={values.memberId} onChange={(e) => update("memberId", e.target.value)} />
      <TextField label="PCN" value={values.pcn} onChange={(e) => update("pcn", e.target.value)} />
      <TextField label="Group ID" value={values.groupId} onChange={(e) => update("groupId", e.target.value)} />
      <TextField label="Policy holder" value={values.policyHolder} onChange={(e) => update("policyHolder", e.target.value)} />
      <TextField label="Monthly household income" value={values.monthlyIncome} onChange={(e) => update("monthlyIncome", e.target.value)} />
      <TextField label="Annual household income" value={values.annualIncome} onChange={(e) => update("annualIncome", e.target.value)} />
      <label className="grid gap-2 text-sm md:col-span-2"><span className="font-medium">Upload documents for the patient</span><input type="file" multiple className="rounded-md border border-slate-300 p-3" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label>
      {message ? <p className="text-sm text-pine md:col-span-2">{message}</p> : null}
      <div className="md:col-span-2"><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save application changes"}</Button></div>
    </div>
  </details>;
}
