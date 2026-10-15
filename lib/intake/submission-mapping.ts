import type { IntakePayload } from "@/lib/types";
import { normalizeBillingEntity } from "@/lib/billing-entities";

type Encryption = { encrypted: Buffer; iv: string; tag: string };
type Encrypt = (input: Buffer) => Encryption;

/** The single source of truth for the existing intake-to-database contract. */
export function mapIntakeSubmission(payload: IntakePayload, userId: string, encrypt: Encrypt) {
  const ssn = payload.patient.socialSecurityNumber?.replace(/\D/g, "") ?? "";
  const encryptedSsn = ssn ? encrypt(Buffer.from(ssn, "utf8")) : null;
  const selfApplicant = payload.hospital.mayoFinancialAssistance?.relationshipToPatient?.length === 1 && payload.hospital.mayoFinancialAssistance.relationshipToPatient[0] === "I am the patient";
  const mayo = payload.hospital.mayoFinancialAssistance;
  return {
    patient: {
      user_id: userId, first_name: payload.patient.firstName, last_name: payload.patient.lastName,
      date_of_birth: payload.patient.dateOfBirth, phone: payload.patient.phone, email: payload.patient.email,
      address_line_1: payload.patient.addressLine1, address_line_2: payload.patient.addressLine2 || null,
      city: payload.patient.city, state: payload.patient.state, postal_code: payload.patient.postalCode,
    },
    submission: {
      assistance_type: payload.assistanceType, representative: payload.representative,
      cancer_type: payload.diagnosis.cancerType,
      diagnosis_date: /^\d{4}-\d{2}$/.test(payload.diagnosis.diagnosisDate) ? `${payload.diagnosis.diagnosisDate}-01` : payload.diagnosis.diagnosisDate,
      treatment_plan: payload.diagnosis.treatments?.filter((item) => item.name.trim()).map((item) => `${item.name}${item.startDate ? ` (${item.startDate})` : ""}`).join("; ") || payload.diagnosis.treatmentPlan,
      treatment_start_date: payload.diagnosis.treatments?.find((item) => item.startDate)?.startDate ? `${payload.diagnosis.treatments.find((item) => item.startDate)!.startDate}-01` : null,
      medication_requested: payload.diagnosis.medications?.filter(Boolean).join("; ") || payload.diagnosis.medicationRequested || null,
      clinic_name: payload.provider.clinicName, provider_name: payload.provider.providerName, provider_npi: payload.provider.npi || "", provider_phone: payload.provider.phone,
      provider_fax: payload.provider.fax || null, provider_address_line_1: payload.provider.addressLine1, provider_address_line_2: payload.provider.addressLine2 || null, provider_city: payload.provider.city, provider_state: payload.provider.state, provider_postal_code: payload.provider.postalCode,
      hospital_account_number: payload.hospital.accountNumber || null, guarantor_number: payload.hospital.guarantorNumber || null,
      treatment_facilities: payload.hospital.treatmentFacilities ?? [], billing_entities: (payload.hospital.billingEntities ?? []).map((entity) => ({ ...entity, ...normalizeBillingEntity(entity.name) })),
      has_insurance: payload.insurance.hasInsurance,
      insurance_details: { ...payload.insurance, volunteerAccessConsent: payload.consent.volunteerAccessConsent, volunteerAccessConsentedAt: payload.consent.signedAt, financialNeeds: payload.household.financialNeeds, utilities: payload.household.financialNeeds?.includes("electricity_gas") ? payload.household.utilities : undefined, socialSecurityNumber: encryptedSsn ? { encrypted: encryptedSsn.encrypted.toString("base64"), iv: encryptedSsn.iv, tag: encryptedSsn.tag, last4: ssn.slice(-4) } : undefined, cancerStage: payload.diagnosis.cancerStage, diagnosisApproximate: payload.diagnosis.diagnosisDate, treatments: payload.diagnosis.treatments, medications: payload.diagnosis.medications, pharmacyName: payload.diagnosis.pharmacyName, mayoFinancialAssistance: mayo ? { ...mayo, applicantFirstName: mayo.applicantFirstName || (selfApplicant ? payload.patient.firstName : ""), applicantLastName: mayo.applicantLastName || (selfApplicant ? payload.patient.lastName : ""), responsiblePartyBirthDate: mayo.responsiblePartyBirthDate || (selfApplicant ? payload.patient.dateOfBirth : ""), location: "Mayo Clinic Arizona" } : undefined },
      monthly_income: payload.household.monthlyIncome, annual_income: payload.household.annualIncome, household_size: payload.household.householdSize, employment_status: payload.household.employmentStatus, household_members: payload.household.members,
      consent_release: payload.consent.releaseMedicalFinancial, consent_contact_permission: payload.consent.contactPermission, signature: payload.consent.signature, signed_at: payload.consent.signedAt,
    },
  };
}
