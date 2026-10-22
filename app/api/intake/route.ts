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
import { mapIntakeSubmission } from "@/lib/intake/submission-mapping";
import type { IntakePayload } from "@/lib/types";
import { submissionFailureDiagnostic } from "@/lib/intake/submission-failure";

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

  // The finalizer is relational-only. A stale page must never cause selected
  // bytes to be silently ignored; saved draft documents transfer atomically,
  // and post-submission uploads use the authenticated dashboard endpoint.
  const directUploadEntries = Array.from(formData.entries()).filter(
    (entry): entry is [string, File] =>
      entry[0].startsWith("document:") && entry[1] instanceof File,
  );
  if (directUploadEntries.length) {
    return NextResponse.json(
      { error: "Save documents before submitting, or upload them from your patient dashboard after your application is received." },
      { status: 400 },
    );
  }

  let draftDocumentIds: string[];
  try {
    draftDocumentIds = z.array(z.string().uuid()).max(100).parse(JSON.parse(String(formData.get("draftDocumentIds") ?? "[]")));
    if (new Set(draftDocumentIds).size !== draftDocumentIds.length) throw new Error("Duplicate documents");
  } catch { return NextResponse.json({error:"Please reload your saved documents before submitting."},{status:400}); }
  const payload = parsed.data;
  const mappedIntake = mapIntakeSubmission(payload as IntakePayload, patientSession.user.id, encryptBuffer);
  const supabase = createServiceClient();
  const fingerprintPayload = structuredClone(payloadJson) as Record<string, unknown>;
  if (fingerprintPayload.consent && typeof fingerprintPayload.consent === "object") delete (fingerprintPayload.consent as Record<string, unknown>).signedAt;
  const requestFingerprint = createHash("sha256").update(JSON.stringify(canonicalize({ payload: fingerprintPayload, draftDocumentIds: [...draftDocumentIds].sort() }))).digest("hex");
  const { data: claimRows, error: claimError } = await supabase.rpc("pcsn_claim_submission_operation", { p_user: patientSession.user.id, p_key: idempotencyKey, p_fingerprint: requestFingerprint });
  const claim = claimRows?.[0] as { outcome: string; lease_token: string | null; submission_id: string | null } | undefined;
  if (claimError || !claim) return NextResponse.json({ error: "Unable to start submission safely." }, { status: 503 });
  if (claim.outcome === "conflict") return NextResponse.json({ error: "This submission key was already used for different information." }, { status: 409 });
  if (claim.outcome === "completed" && claim.submission_id) return NextResponse.json({ ok: true, duplicate: true, submissionId: claim.submission_id }, { status: 200 });
  if (claim.outcome !== "claimed" || !claim.lease_token) return NextResponse.json({ error: "This submission is still being processed. Please wait before retrying." }, { status: 409 });
  const leaseToken = claim.lease_token;
  const clearIdempotency = () => supabase.rpc("pcsn_release_submission_operation", { p_user: patientSession.user.id, p_key: idempotencyKey, p_token: leaseToken });
  const { data: finalizedRows, error: finalizationError } = await supabase.rpc("pcsn_finalize_submission_operation", { p_user: patientSession.user.id, p_key: idempotencyKey, p_token: leaseToken, p_patient: mappedIntake.patient, p_submission: mappedIntake.submission, p_draft_ids: draftDocumentIds });
  const submission = finalizedRows?.[0] as { submission_id: string } | undefined;
  if (finalizationError || !submission?.submission_id) {
    await clearIdempotency();
    console.error("Intake finalization failed", submissionFailureDiagnostic(finalizationError ?? {}, null));
    return NextResponse.json({ error: "Unable to save submission" }, { status: 500 });
  }

  // The finalization RPC transfers draft metadata and marks the operation
  // completed in the same transaction. Direct uploads happen only in /patient.
  const [draftCleanup] = await Promise.all([supabase.from("intake_drafts").delete().eq("user_id", patientSession.user.id), sendNewSubmissionNotification(), sendPatientSubmissionConfirmation(payload.patient.email)]);
  if (draftCleanup.error) console.error("Intake draft cleanup failed");

  return NextResponse.json({ ok: true }, { status: 201 });
}
