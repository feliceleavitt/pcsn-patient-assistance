import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { actorColumns } from "@/lib/security/actors";
import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode, updateDemoSubmission } from "@/lib/demo/admin";
import { encryptBuffer } from "@/lib/security/crypto";

const applicationSchema = z.object({
  firstName: z.string(), lastName: z.string(), dateOfBirth: z.string(), phone: z.string(), email: z.string().email(),
  cancerType: z.string(), cancerStage: z.string(), diagnosisDate: z.string(), treatmentPlan: z.string(), medications: z.string(), pharmacyName: z.string(),
  providerName: z.string(), providerNpi: z.string(), insuranceCompany: z.string(), memberId: z.string(), pcn: z.string(), groupId: z.string(), policyHolder: z.string(),
  monthlyIncome: z.string(), annualIncome: z.string(),
});

const updateSchema = z.object({
  status: z.enum([
    "submitted",
    "under_review",
    "missing_documents",
    "approved",
    "denied",
    "renewal_needed",
  ]),
  missingDocuments: z.array(z.string()),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId } = await params;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    if (isDemoMode()) return NextResponse.json({ error: "Editing is unavailable in demo mode." }, { status: 400 });
    const formData = await request.formData();
    const raw = formData.get("payload");
    let applicationPayload: unknown = null;
    try { applicationPayload = typeof raw === "string" ? JSON.parse(raw) : null; } catch { applicationPayload = null; }
    const parsed = applicationSchema.safeParse(applicationPayload);
    if (!parsed.success) return NextResponse.json({ error: "Please check the application fields." }, { status: 400 });
    const supabase = createServiceClient();
    const { data: submission } = await supabase.from("submissions").select("patient_id,insurance_details").eq("id", submissionId).single();
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    const income = (value: string) => Number(value.replace(/[$,\s]/g, "")) || 0;
    await supabase.from("patients").update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, date_of_birth: parsed.data.dateOfBirth, phone: parsed.data.phone, email: parsed.data.email }).eq("id", submission.patient_id);
    await supabase.from("submissions").update({ cancer_type: parsed.data.cancerType, diagnosis_date: parsed.data.diagnosisDate, treatment_plan: parsed.data.treatmentPlan, medication_requested: parsed.data.medications, provider_name: parsed.data.providerName, provider_npi: parsed.data.providerNpi, monthly_income: income(parsed.data.monthlyIncome), annual_income: income(parsed.data.annualIncome), insurance_details: { ...(submission.insurance_details ?? {}), cancerStage: parsed.data.cancerStage, pharmacyName: parsed.data.pharmacyName, medicalCarrier: parsed.data.insuranceCompany, medicalMemberId: parsed.data.memberId, medicalPcn: parsed.data.pcn, medicalGroupId: parsed.data.groupId, medicalPolicyHolder: parsed.data.policyHolder } }).eq("id", submissionId);
    const internalLabel = String(formData.get("internalDocumentLabel") || "internal_note_attachment").replace(/[^a-z0-9_]/g, "_");
    const internalComment = String(formData.get("internalDocumentComment") || "").trim();
    const uploadedNames: string[] = [];
    for (const file of formData.getAll("documents")) {
      if (!(file instanceof File)) continue;
      const encrypted = encryptBuffer(Buffer.from(await file.arrayBuffer()));
      const storagePath = `${submissionId}/${crypto.randomUUID()}.bin`;
      const { error: uploadError } = await supabase.storage.from("encrypted-documents").upload(storagePath, encrypted.encrypted, { contentType: "application/octet-stream" });
      if (uploadError) return NextResponse.json({ error: "Unable to upload a document." }, { status: 500 });
      await supabase.from("documents").insert({ submission_id: submissionId, original_filename: file.name, document_type: `internal_record:${internalLabel}`, storage_path: storagePath, mime_type: file.type || "application/octet-stream", byte_size: file.size, encryption_iv: encrypted.iv, encryption_tag: encrypted.tag });
      uploadedNames.push(file.name);
    }
    if (uploadedNames.length) await supabase.from("admin_notes").insert({ submission_id: submissionId, note: `Internal document (${internalLabel.replaceAll("_", " ")}): ${uploadedNames.join(", ")}${internalComment ? ` — ${internalComment}` : ""}`, ...actorColumns(session.user.id, "author_id", "author_identifier") });
    await recordAuditEvent({ actorId: session.user.id, action: "update_submission", submissionId, metadata: { volunteerEditedApplication: true, documentsUploaded: formData.getAll("documents").length } });
    return NextResponse.json({ ok: true });
  }
  const body = updateSchema.parse(await request.json());

  if (isDemoMode()) {
    const updated = updateDemoSubmission(submissionId, body);
    if (!updated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("submissions")
    .update({
      status: body.status,
      missing_documents: body.missingDocuments,
    })
    .eq("id", submissionId);

  if (error) {
    return NextResponse.json({ error: "Unable to update submission" }, { status: 500 });
  }

  if (body.note?.trim()) {
    await supabase.from("admin_notes").insert({
      submission_id: submissionId,
      note: body.note.trim(),
      ...actorColumns(session.user.id, "author_id", "author_identifier"),
    });
  }

  await recordAuditEvent({
    actorId: session.user.id,
    action: "update_submission",
    submissionId,
    metadata: {
      status: body.status,
      missingDocumentsCount: body.missingDocuments.length,
      noteAdded: Boolean(body.note?.trim()),
    },
  });

  return NextResponse.json({ ok: true });
}
