import { financialNeedOptions } from "@/lib/intake/needs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import {
  sendNewSubmissionNotification,
  sendPatientSubmissionConfirmation,
} from "@/lib/notifications/email";
import { encryptBuffer } from "@/lib/security/crypto";
import { getPatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeBillingEntity } from "@/lib/billing-entities";
import { documentMime, patientDocumentTypes } from "@/lib/intake/documents";
import {
  cleanupNewPatientAfterSubmissionFailure,
  submissionFailureDiagnostic,
} from "@/lib/intake/submission-failure";

const payloadSchema = z.object({
  assistanceType: z.enum(["manufacturer", "hospital", "both"]),
  patient: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    socialSecurityNumber: z.string().optional().default("").transform((value) => value.replace(/\D/g, "")).pipe(z.string().refine(value => value === "" || /^\d{9}$/.test(value), "Enter nine digits or leave blank.")),
    phone: z.string().min(1),
    email: z.string().email(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    employmentStatus: z.string().min(1),
    incomeSources: z.array(z.string()),
  }),
  representative: z.object({
    hasRepresentative: z.boolean(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }),
  diagnosis: z.object({
    cancerType: z.string().min(1),
    cancerStage: z.string().optional(),
    diagnosisDate: z.string().min(1),
    treatmentPlan: z.string().optional().default(""),
    treatmentStartDate: z.string().optional(),
    medicationRequested: z.string().optional(),
    treatments: z.array(z.object({ name: z.string(), startDate: z.string().optional() })).default([]),
    medications: z.array(z.string()).default([]),
    pharmacyName: z.string().optional(),
  }),
  provider: z.object({
    clinicName: z.string().min(1),
    providerName: z.string().min(1),
    npi: z.string().optional(),
    phone: z.string().optional().default(""),
    fax: z.string().optional(),
    addressLine1: z.string().optional().default(""),
    addressLine2: z.string().optional(),
    city: z.string().optional().default(""),
    state: z.string().optional().default(""),
    postalCode: z.string().optional().default(""),
  }),
  hospital: z.object({
    accountNumber: z.string().optional(),
    guarantorNumber: z.string().optional(),
    treatmentFacilities: z.array(z.string()).default([]),
    billingEntities: z.array(z.object({ name: z.string().trim().min(1).max(200), accountNumber: z.string().max(200).optional(), billType: z.string().max(100).optional(), documentId: z.string().uuid().optional() })).max(20).default([]),
    mayoFinancialAssistance: z.object({
      relationshipToPatient: z.array(z.string()), applicantFirstName: z.string(), applicantMiddleName: z.string(), applicantLastName: z.string(), mayoClinicNumber: z.string().optional(), responsiblePartyBirthDate: z.string(), maritalStatus: z.string().optional(), unemployedSince: z.string().optional(),
      claimedOnAnotherTaxReturn: z.enum(["yes", "no", ""]), assistanceNeed: z.string(), appliedForGovernmentAssistance: z.enum(["yes", "no", ""]), governmentAssistanceReason: z.string().optional(), pendingClaim: z.enum(["yes", "no", ""]), pendingClaimReason: z.string().optional(), employerInsuranceAvailable: z.enum(["yes", "no", ""]), employerInsuranceReason: z.string().optional(),
      hasSpouse: z.boolean(), spouseFirstName: z.string().optional(), spouseMiddleName: z.string().optional(), spouseLastName: z.string().optional(), spouseBirthDate: z.string().optional(), spouseEmploymentStatus: z.string().optional(), dependentsDetails: z.string(), otherIncomeDetails: z.string(), medicalDebtDetails: z.string(), certificationAccepted: z.boolean(),
    }).optional(),
  }),
  insurance: z.object({
    hasInsurance: z.boolean(),
    hasMedicalInsurance: z.boolean(),
    medicalCarrier: z.string().optional(),
    medicalPolicyId: z.string().optional(),
    medicalGroupId: z.string().optional(),
    medicalMemberId: z.string().optional(),
    medicalPcn: z.string().optional(),
    medicalPolicyHolder: z.string().optional(),
    hasPharmacyInsurance: z.boolean(),
    pharmacyCarrier: z.string().optional(),
    pharmacyPolicyId: z.string().optional(),
    pharmacyGroupId: z.string().optional(),
    pharmacyMemberId: z.string().optional(),
    pharmacyPcn: z.string().optional(),
    pharmacyPolicyHolder: z.string().optional(),
    hasMedicare: z.boolean(),
    hasMedicaid: z.boolean(),
    priorAuthorizationStatus: z.string().optional(),
    appealStatus: z.string().optional(),
    coverageDenied: z.enum(["yes", "no", "not_sure"]),
    denialDetails: z.string().optional(),
    eobAvailable: z.boolean(),
  }),
  household: z.object({
    financialNeeds: z.array(z.string().refine(value => financialNeedOptions.some(([id]) => id === value))).max(12).optional(),
    utilities: z.object({ utilityProvider:z.string().max(200).optional(),accountHolder:z.string().max(200).optional(),serviceAddress:z.string().max(500).optional(),shutoff:z.enum(["yes","no","not_sure",""]).optional(),utilitiesInRent:z.enum(["yes","no","not_sure",""]).optional() }).optional(),
    monthlyIncome: z.union([z.number(), z.string()]).transform((value) => Number(String(value).replace(/[$,\s]/g, ""))).pipe(z.number().nonnegative()),
    annualIncome: z.union([z.number(), z.string()]).transform((value) => Number(String(value).replace(/[$,\s]/g, ""))).pipe(z.number().nonnegative()),
    householdSize: z.number().int().positive(),
    employmentStatus: z.string().min(1),
    members: z.array(
      z.object({
        name: z.string().min(1),
        relationship: z.string().min(1),
        age: z.number().int().nonnegative(),
        isAdult: z.boolean(),
        employmentStatus: z.string().optional(),
        incomeSources: z.array(z.string()),
      }),
    ),
  }),
  consent: z.object({
    volunteerAccessConsent: z.literal(true),
    releaseMedicalFinancial: z.literal(true),
    contactPermission: z.literal(true),
    noGuaranteeAcknowledgment: z.literal(true),
    signature: z.string().min(1),
    signedAt: z.string().datetime(),
  }),
});

const fieldLabels: Record<string, string> = {
  "patient.firstName": "patient first name",
  "patient.lastName": "patient last name",
  "patient.dateOfBirth": "patient date of birth",
  "patient.socialSecurityNumber": "patient Social Security number",
  "patient.phone": "patient phone number",
  "patient.email": "patient email",
  "patient.addressLine1": "patient address",
  "patient.city": "patient city",
  "patient.state": "patient state",
  "patient.postalCode": "patient postal code",
  "patient.employmentStatus": "patient employment status",
  "diagnosis.cancerType": "cancer type",
  "diagnosis.diagnosisDate": "diagnosis date",
  "diagnosis.treatmentPlan": "treatment plan",
  "provider.clinicName": "clinic name",
  "provider.providerName": "provider name",
  "provider.phone": "provider phone number",
  "provider.addressLine1": "provider address",
  "provider.city": "provider city",
  "provider.state": "provider state",
  "provider.postalCode": "provider postal code",
  "household.monthlyIncome": "monthly household income",
  "household.annualIncome": "annual household income",
  "household.householdSize": "household size",
  "household.employmentStatus": "patient employment status",
  "consent.releaseMedicalFinancial": "authorization checkbox",
  "consent.volunteerAccessConsent": "volunteer access and contact consent checkbox",
  "consent.contactPermission": "contact permission checkbox",
  "consent.noGuaranteeAcknowledgment": "no-guarantee checkbox",
  "consent.signature": "electronic signature",
};

function formatValidationError(error: z.ZodError) {
  const labels = error.issues
    .map((issue) => {
      const path = issue.path
        .filter((part) => typeof part === "string")
        .join(".");
      return fieldLabels[path] ?? path;
    })
    .filter(Boolean);
  const uniqueLabels = [...new Set(labels)];

  if (!uniqueLabels.length) {
    return "Please check the form for missing or incorrect information.";
  }

  return `Please check: ${uniqueLabels.slice(0, 6).join(", ")}.`;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]));
  return value;
}

export async function POST(request: Request) {
  const patientSession = await getPatientSession();
  if (!patientSession) {
    return NextResponse.json(
      { error: "Please create an account or sign in before submitting your application." },
      { status: 401 },
    );
  }
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) {
    return NextResponse.json({ error: "Please reload and try submitting again." }, { status: 400 });
  }

  const formData = await request.formData();
  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json(
      { error: "We could not read the form. Please try again." },
      { status: 400 },
    );
  }

  const parsed = payloadSchema.safeParse(payloadJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatValidationError(parsed.error) },
      { status: 400 },
    );
  }

  // Final submission uploads must meet the same server-side restrictions as
  // saved draft uploads. Validate every file before creating any database rows.
  const files = Array.from(formData.entries()).filter(
    (entry): entry is [string, File] =>
      entry[0].startsWith("document:") && entry[1] instanceof File,
  );
  if (files.length > 20) {
    return NextResponse.json({ error: "Please upload no more than 20 documents." }, { status: 400 });
  }
  const uploadedDocuments: Array<{ documentType: string; file: File; bytes: Buffer; mimeType: string }> = [];
  for (const [key, file] of files) {
    const documentType = key.replace("document:", "");
    if (
      !patientDocumentTypes.includes(documentType) ||
      file.size === 0 ||
      file.size > 4_194_304
    ) {
      return NextResponse.json(
        { error: "Choose a valid document category and a PDF, JPG, or PNG up to 4 MB." },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = documentMime(bytes);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Documents must be PDF, JPG, or PNG files." },
        { status: 400 },
      );
    }
    uploadedDocuments.push({ documentType, file, bytes, mimeType });
  }

  let draftDocumentIds: string[];
  try {
    draftDocumentIds = z.array(z.string().uuid()).max(100).parse(JSON.parse(String(formData.get("draftDocumentIds") ?? "[]")));
    if (new Set(draftDocumentIds).size !== draftDocumentIds.length) throw new Error("Duplicate documents");
  } catch { return NextResponse.json({error:"Please reload your saved documents before submitting."},{status:400}); }
  const payload = parsed.data;
  const encryptedSsn = payload.patient.socialSecurityNumber ? encryptBuffer(Buffer.from(payload.patient.socialSecurityNumber, "utf8")) : null;
  const supabase = createServiceClient();
  const fingerprintPayload = structuredClone(payloadJson) as Record<string, unknown>;
  if (fingerprintPayload.consent && typeof fingerprintPayload.consent === "object") delete (fingerprintPayload.consent as Record<string, unknown>).signedAt;
  const requestFingerprint = createHash("sha256").update(JSON.stringify(canonicalize({ payload: fingerprintPayload, draftDocumentIds: [...draftDocumentIds].sort(), uploads: uploadedDocuments.map(({ documentType, file }) => ({ documentType, name: file.name, size: file.size })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) }))).digest("hex");
  const { data: claimRows, error: claimError } = await supabase.rpc("pcsn_claim_submission_operation", { p_user: patientSession.user.id, p_key: idempotencyKey, p_fingerprint: requestFingerprint });
  const claim = claimRows?.[0] as { outcome: string; lease_token: string | null; submission_id: string | null } | undefined;
  if (claimError || !claim) return NextResponse.json({ error: "Unable to start submission safely." }, { status: 503 });
  if (claim.outcome === "conflict") return NextResponse.json({ error: "This submission key was already used for different information." }, { status: 409 });
  if (claim.outcome === "completed" && claim.submission_id) return NextResponse.json({ ok: true, duplicate: true, submissionId: claim.submission_id }, { status: 200 });
  if (claim.outcome !== "claimed" || !claim.lease_token) return NextResponse.json({ error: "This submission is still being processed. Please wait before retrying." }, { status: 409 });
  const leaseToken = claim.lease_token;
  const clearIdempotency = () => supabase.rpc("pcsn_release_submission_operation", { p_user: patientSession.user.id, p_key: idempotencyKey, p_token: leaseToken });
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
      user_id: patientSession.user.id,
      first_name: payload.patient.firstName,
      last_name: payload.patient.lastName,
      date_of_birth: payload.patient.dateOfBirth,
      phone: payload.patient.phone,
      email: payload.patient.email,
      address_line_1: payload.patient.addressLine1,
      address_line_2: payload.patient.addressLine2 || null,
      city: payload.patient.city,
      state: payload.patient.state,
      postal_code: payload.patient.postalCode,
    })
    .select("id")
    .single();

  if (patientError) {
    await clearIdempotency();
    return NextResponse.json({ error: "Unable to save patient" }, { status: 500 });
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      patient_id: patient.id,
      assistance_type: payload.assistanceType,
      representative: payload.representative,
      cancer_type: payload.diagnosis.cancerType,
      diagnosis_date: /^\d{4}-\d{2}$/.test(payload.diagnosis.diagnosisDate) ? `${payload.diagnosis.diagnosisDate}-01` : payload.diagnosis.diagnosisDate,
      treatment_plan: payload.diagnosis.treatments.filter((item) => item.name.trim()).map((item) => `${item.name}${item.startDate ? ` (${item.startDate})` : ""}`).join("; ") || payload.diagnosis.treatmentPlan,
      treatment_start_date: payload.diagnosis.treatments.find((item) => item.startDate)?.startDate ? `${payload.diagnosis.treatments.find((item) => item.startDate)!.startDate}-01` : null,
      medication_requested: payload.diagnosis.medications.filter(Boolean).join("; ") || payload.diagnosis.medicationRequested || null,
      clinic_name: payload.provider.clinicName,
      provider_name: payload.provider.providerName,
      provider_npi: payload.provider.npi || "",
      provider_phone: payload.provider.phone,
      provider_fax: payload.provider.fax || null,
      provider_address_line_1: payload.provider.addressLine1,
      provider_address_line_2: payload.provider.addressLine2 || null,
      provider_city: payload.provider.city,
      provider_state: payload.provider.state,
      provider_postal_code: payload.provider.postalCode,
      hospital_account_number: payload.hospital.accountNumber || null,
      guarantor_number: payload.hospital.guarantorNumber || null,
      treatment_facilities: payload.hospital.treatmentFacilities,
      billing_entities: payload.hospital.billingEntities.map((entity) => ({ ...entity, ...normalizeBillingEntity(entity.name) })),
      has_insurance: payload.insurance.hasInsurance,
      insurance_details: { ...payload.insurance, volunteerAccessConsent: payload.consent.volunteerAccessConsent, volunteerAccessConsentedAt: payload.consent.signedAt, financialNeeds: payload.household.financialNeeds, utilities: payload.household.financialNeeds?.includes("electricity_gas") ? payload.household.utilities : undefined, socialSecurityNumber: encryptedSsn ? { encrypted: encryptedSsn.encrypted.toString("base64"), iv: encryptedSsn.iv, tag: encryptedSsn.tag, last4: payload.patient.socialSecurityNumber.slice(-4) } : undefined, cancerStage: payload.diagnosis.cancerStage, diagnosisApproximate: payload.diagnosis.diagnosisDate, treatments: payload.diagnosis.treatments, medications: payload.diagnosis.medications, pharmacyName: payload.diagnosis.pharmacyName, mayoFinancialAssistance: payload.hospital.mayoFinancialAssistance ? { ...payload.hospital.mayoFinancialAssistance, applicantFirstName: payload.hospital.mayoFinancialAssistance.applicantFirstName || (payload.hospital.mayoFinancialAssistance.relationshipToPatient?.length === 1 && payload.hospital.mayoFinancialAssistance.relationshipToPatient[0] === "I am the patient" ? payload.patient.firstName : ""), applicantLastName: payload.hospital.mayoFinancialAssistance.applicantLastName || (payload.hospital.mayoFinancialAssistance.relationshipToPatient?.length === 1 && payload.hospital.mayoFinancialAssistance.relationshipToPatient[0] === "I am the patient" ? payload.patient.lastName : ""), responsiblePartyBirthDate: payload.hospital.mayoFinancialAssistance.responsiblePartyBirthDate || (payload.hospital.mayoFinancialAssistance.relationshipToPatient?.length === 1 && payload.hospital.mayoFinancialAssistance.relationshipToPatient[0] === "I am the patient" ? payload.patient.dateOfBirth : ""), location: "Mayo Clinic Arizona" } : undefined },
      monthly_income: payload.household.monthlyIncome,
      annual_income: payload.household.annualIncome,
      household_size: payload.household.householdSize,
      employment_status: payload.household.employmentStatus,
      household_members: payload.household.members,
      consent_release: payload.consent.releaseMedicalFinancial,
      consent_contact_permission: payload.consent.contactPermission,
      signature: payload.consent.signature,
      signed_at: payload.consent.signedAt,
    })
    .select("id")
    .single();

  if (submissionError) {
    const cleanupError = await cleanupNewPatientAfterSubmissionFailure(() =>
      supabase
        .from("patients")
        .delete()
        .eq("id", patient.id)
        .eq("user_id", patientSession.user.id),
    );
    console.error(
      "Intake submission insert failed",
      submissionFailureDiagnostic(submissionError, cleanupError),
    );
    await clearIdempotency();
    return NextResponse.json(
      { error: "Unable to save submission" },
      { status: 500 },
    );
  }

  if (draftDocumentIds.length) {
    const {error:attachError} = await supabase.rpc("pcsn_attach_draft_documents", {p_user:patientSession.user.id,p_submission:submission.id,p_ids:draftDocumentIds});
    if (attachError) {
      // The transfer RPC is atomic. Keep the original draft and documents for retry.
      await supabase.from("submissions").delete().eq("id",submission.id);
      await supabase.from("patients").delete().eq("id",patient.id).eq("user_id",patientSession.user.id);
      await clearIdempotency();
      return NextResponse.json({error:"Saved documents could not be attached. Your draft is retained; reload and try again."},{status:409});
    }
  }

  for (const { documentType, file, bytes, mimeType } of uploadedDocuments) {
    const encrypted = encryptBuffer(bytes);
    const storagePath = `${submission.id}/${crypto.randomUUID()}.bin`;
    const { error: uploadError } = await supabase.storage
      .from("encrypted-documents")
      .upload(storagePath, encrypted.encrypted, {
        contentType: "application/octet-stream",
      });

    if (uploadError) {
      await clearIdempotency();
      return NextResponse.json({ error: "Unable to upload document" }, { status: 500 });
    }

    const { error: documentError } = await supabase.from("documents").insert({
      submission_id: submission.id,
      original_filename: file.name.slice(0, 255),
      document_type: documentType,
      storage_path: storagePath,
      mime_type: mimeType,
      byte_size: file.size,
      encryption_iv: encrypted.iv,
      encryption_tag: encrypted.tag,
    });
    if (documentError) {
      await supabase.storage.from("encrypted-documents").remove([storagePath]);
      await clearIdempotency();
      return NextResponse.json({ error: "Unable to save document metadata" }, { status: 500 });
    }
  }

  const { data: completed, error: completionError } = await supabase.rpc("pcsn_complete_submission_operation", { p_user: patientSession.user.id, p_key: idempotencyKey, p_token: leaseToken, p_submission: submission.id });
  if (completionError || completed !== true) return NextResponse.json({ error: "Submission was saved but completion could not be confirmed. Please retry with the same request." }, { status: 503 });
  await Promise.all([supabase.from("intake_drafts").delete().eq("user_id", patientSession.user.id), sendNewSubmissionNotification(), sendPatientSubmissionConfirmation(payload.patient.email)]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
