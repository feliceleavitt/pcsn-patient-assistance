import type { FinancialDetails } from "./intake/financial";
export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "missing_documents"
  | "approved"
  | "denied"
  | "renewal_needed";

export type AdminRole = "admin" | "reviewer";

export type MayoFinancialAssistance = {
  relationshipToPatient: string[];
  applicantFirstName: string;
  applicantMiddleName: string;
  applicantLastName: string;
  mayoClinicNumber?: string;
  responsiblePartyBirthDate: string;
  maritalStatus?: string;
  unemployedSince?: string;
  claimedOnAnotherTaxReturn: "yes" | "no" | "";
  assistanceNeed: string;
  appliedForGovernmentAssistance: "yes" | "no" | "";
  governmentAssistanceReason?: string;
  pendingClaim: "yes" | "no" | "";
  pendingClaimReason?: string;
  employerInsuranceAvailable: "yes" | "no" | "";
  employerInsuranceReason?: string;
  hasSpouse: boolean;
  spouseFirstName?: string;
  spouseMiddleName?: string;
  spouseLastName?: string;
  spouseBirthDate?: string;
  spouseEmploymentStatus?: string;
  dependentsDetails: string;
  otherIncomeDetails: string;
  medicalDebtDetails: string;
  certificationAccepted: boolean;
};

export type IntakePayload = {
  financial?: FinancialDetails;
  assistanceType: "manufacturer" | "hospital" | "both";
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    socialSecurityNumber: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    employmentStatus: string;
    incomeSources: string[];
  };
  representative: {
    hasRepresentative: boolean;
    firstName?: string;
    lastName?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  diagnosis: {
    cancerType: string;
    cancerStage?: string;
    diagnosisDate: string;
    treatmentPlan: string;
    treatmentStartDate?: string;
    medicationRequested?: string;
    treatments?: Array<{ name: string; startDate?: string }>;
    medications?: string[];
    pharmacyName?: string;
  };
  provider: {
    clinicName: string;
    providerName: string;
    npi: string;
    phone: string;
    fax?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  hospital: {
    accountNumber?: string;
    guarantorNumber?: string;
    treatmentFacilities?: string[];
    mayoFinancialAssistance?: MayoFinancialAssistance;
  };
  insurance: {
    hasInsurance: boolean;
    hasMedicalInsurance: boolean;
    medicalCarrier?: string;
    medicalPolicyId?: string;
    medicalGroupId?: string;
    medicalMemberId?: string;
    medicalPcn?: string;
    medicalPolicyHolder?: string;
    hasPharmacyInsurance: boolean;
    pharmacyCarrier?: string;
    pharmacyPolicyId?: string;
    pharmacyGroupId?: string;
    pharmacyMemberId?: string;
    pharmacyPcn?: string;
    pharmacyPolicyHolder?: string;
    hasMedicare: boolean;
    hasMedicaid: boolean;
    priorAuthorizationStatus?: string;
    appealStatus?: string;
    coverageDenied: "yes" | "no" | "not_sure";
    denialDetails?: string;
    eobAvailable: boolean;
  };
  household: {
    financialNeeds?: string[];
    utilities?: { utilityProvider?: string; accountHolder?: string; serviceAddress?: string; shutoff?: string; utilitiesInRent?: string };
    monthlyIncome: number | string;
    annualIncome: number | string;
    householdSize: number;
    employmentStatus: string;
    members: Array<{
      name: string;
      relationship: string;
      dateOfBirth?: string;
      dependent?: "yes"|"no"|"not_sure"|"";
      sharesFinances?: "yes"|"no"|"not_sure"|"";
      supportsPatient?: "yes"|"no"|"not_sure"|"";
      supportedByPatient?: "yes"|"no"|"not_sure"|"";
      age: number;
      isAdult: boolean;
      employmentStatus?: string;
      incomeSources: string[];
    }>;
  };
  consent: {
    volunteerAccessConsent: boolean;
    releaseMedicalFinancial: boolean;
    contactPermission: boolean;
    noGuaranteeAcknowledgment: boolean;
    signature: string;
    signedAt: string;
  };
};
