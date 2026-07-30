import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptBuffer } from "@/lib/security/crypto";
import { createServiceClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  assistanceType: z.enum(["manufacturer", "hospital", "both"]),
  patient: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
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
    diagnosisDate: z.string().min(1),
    treatmentPlan: z.string().min(1),
    treatmentStartDate: z.string().optional(),
    medicationRequested: z.string().optional(),
  }),
  provider: z.object({
    clinicName: z.string().min(1),
    providerName: z.string().min(1),
    npi: z.string().min(1),
    phone: z.string().min(1),
    fax: z.string().optional(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
  }),
  hospital: z.object({
    accountNumber: z.string().optional(),
    guarantorNumber: z.string().optional(),
  }),
  insurance: z.object({
    hasInsurance: z.boolean(),
    hasMedicalInsurance: z.boolean(),
    medicalCarrier: z.string().optional(),
    medicalPolicyId: z.string().optional(),
    medicalGroupId: z.string().optional(),
    medicalMemberId: z.string().optional(),
    hasPharmacyInsurance: z.boolean(),
    pharmacyCarrier: z.string().optional(),
    pharmacyPolicyId: z.string().optional(),
    pharmacyGroupId: z.string().optional(),
    pharmacyMemberId: z.string().optional(),
    hasMedicare: z.boolean(),
    hasMedicaid: z.boolean(),
    priorAuthorizationStatus: z.string().optional(),
    appealStatus: z.string().optional(),
    coverageDenied: z.enum(["yes", "no", "not_sure"]),
    eobAvailable: z.boolean(),
  }),
  household: z.object({
    monthlyIncome: z.number().nonnegative(),
    annualIncome: z.number().nonnegative(),
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
    releaseMedicalFinancial: z.literal(true),
    contactPermission: z.literal(true),
    noGuaranteeAcknowledgment: z.literal(true),
    signature: z.string().min(1),
    signedAt: z.string().datetime(),
  }),
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(JSON.parse(rawPayload));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const supabase = createServiceClient();
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
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
    return NextResponse.json({ error: "Unable to save patient" }, { status: 500 });
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      patient_id: patient.id,
      assistance_type: payload.assistanceType,
      representative: payload.representative,
      cancer_type: payload.diagnosis.cancerType,
      diagnosis_date: payload.diagnosis.diagnosisDate,
      treatment_plan: payload.diagnosis.treatmentPlan,
      treatment_start_date: payload.diagnosis.treatmentStartDate || null,
      medication_requested: payload.diagnosis.medicationRequested || null,
      clinic_name: payload.provider.clinicName,
      provider_name: payload.provider.providerName,
      provider_npi: payload.provider.npi,
      provider_phone: payload.provider.phone,
      provider_fax: payload.provider.fax || null,
      provider_address_line_1: payload.provider.addressLine1,
      provider_address_line_2: payload.provider.addressLine2 || null,
      provider_city: payload.provider.city,
      provider_state: payload.provider.state,
      provider_postal_code: payload.provider.postalCode,
      hospital_account_number: payload.hospital.accountNumber || null,
      guarantor_number: payload.hospital.guarantorNumber || null,
      has_insurance: payload.insurance.hasInsurance,
      insurance_details: payload.insurance,
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
    return NextResponse.json(
      { error: "Unable to save submission" },
      { status: 500 },
    );
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
      return NextResponse.json({ error: "Unable to upload document" }, { status: 500 });
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

  return NextResponse.json({ ok: true }, { status: 201 });
}
