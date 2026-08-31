import { NextResponse } from "next/server";
import { z } from "zod";
import { sendNewSubmissionNotification } from "@/lib/notifications/email";
import { encryptBuffer } from "@/lib/security/crypto";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  volunteerAccessConsent: z.literal(true),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  message: z.string().optional(),
});

async function getLatestSubmission(userId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("submissions")
    .select("*,patients!inner(*),documents(*)")
    .eq("patients.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function GET() {
  const session = await requirePatientSession();
  const submission = await getLatestSubmission(session.user.id);
  if (!submission) {
    return NextResponse.json({ application: null });
  }

  return NextResponse.json({
    application: {
      status: submission.status,
      createdAt: submission.created_at,
      assistanceType: submission.assistance_type,
      missingDocuments: submission.missing_documents,
      patient: submission.patients,
      documents: submission.documents.map(
        (document: {
          id: string;
          original_filename: string;
          document_type: string;
          uploaded_at: string;
        }) => ({
          id: document.id,
          originalFilename: document.original_filename,
          documentType: document.document_type,
          uploadedAt: document.uploaded_at,
        }),
      ),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await requirePatientSession();
  const formData = await request.formData();
  const rawPayload = formData.get("payload");
  let payload: unknown = {};
  if (typeof rawPayload === "string") {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json({ error: "Unable to save updates." }, { status: 400 });
    }
  }
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Unable to save updates." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const submission = await getLatestSubmission(session.user.id);
  if (!submission) {
    return NextResponse.json({ error: "No application found." }, { status: 404 });
  }

  const patientUpdates = {
    phone: parsed.data.phone || submission.patients.phone,
    email: parsed.data.email || submission.patients.email,
    address_line_1: parsed.data.addressLine1 || submission.patients.address_line_1,
    address_line_2:
      parsed.data.addressLine2 === undefined
        ? submission.patients.address_line_2
        : parsed.data.addressLine2 || null,
    city: parsed.data.city || submission.patients.city,
    state: parsed.data.state || submission.patients.state,
    postal_code: parsed.data.postalCode || submission.patients.postal_code,
  };

  const { error: patientError } = await supabase
    .from("patients")
    .update(patientUpdates)
    .eq("id", submission.patient_id)
    .eq("user_id", session.user.id);

  if (patientError) {
    return NextResponse.json({ error: "Unable to update contact information." }, { status: 500 });
  }

  const files = Array.from(formData.entries()).filter(
    (entry): entry is [string, File] =>
      entry[0].startsWith("document:") && entry[1] instanceof File,
  );

  for (const [key, file] of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const encrypted = encryptBuffer(bytes);
    const storagePath = `${submission.id}/${crypto.randomUUID()}.bin`;
    const { error: uploadError } = await supabase.storage
      .from("encrypted-documents")
      .upload(storagePath, encrypted.encrypted, {
        contentType: "application/octet-stream",
      });

    if (uploadError) {
      return NextResponse.json({ error: "Unable to upload document." }, { status: 500 });
    }

    await supabase.from("documents").insert({
      submission_id: submission.id,
      original_filename: file.name,
      document_type: key.replace("document:", ""),
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      byte_size: file.size,
      encryption_iv: encrypted.iv,
      encryption_tag: encrypted.tag,
    });
  }

  if (parsed.data.message?.trim()) {
    await supabase.from("admin_notes").insert({
      submission_id: submission.id,
      author_id: `patient:${session.user.email}`,
      note: `Patient update: ${parsed.data.message.trim()}`,
    });
  }

  if (files.length || parsed.data.message?.trim()) {
    await supabase
      .from("submissions")
      .update({ status: "under_review" })
      .eq("id", submission.id);
    await sendNewSubmissionNotification();
  }

  return NextResponse.json({ ok: true });
}
