export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "missing_documents"
  | "approved"
  | "denied"
  | "renewal_needed";

export type AdminRole = "admin" | "reviewer";

export type IntakePayload = {
  assistanceType: "manufacturer" | "hospital" | "both";
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
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
    diagnosisDate: string;
    treatmentPlan: string;
    treatmentStartDate?: string;
    medicationRequested?: string;
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
  };
  insurance: {
    hasInsurance: boolean;
    hasMedicalInsurance: boolean;
    medicalCarrier?: string;
    medicalPolicyId?: string;
    medicalGroupId?: string;
    medicalMemberId?: string;
    hasPharmacyInsurance: boolean;
    pharmacyCarrier?: string;
    pharmacyPolicyId?: string;
    pharmacyGroupId?: string;
    pharmacyMemberId?: string;
    hasMedicare: boolean;
    hasMedicaid: boolean;
    priorAuthorizationStatus?: string;
    appealStatus?: string;
    coverageDenied: "yes" | "no" | "not_sure";
    eobAvailable: boolean;
  };
  household: {
    monthlyIncome: number;
    annualIncome: number;
    householdSize: number;
    employmentStatus: string;
    members: Array<{
      name: string;
      relationship: string;
      age: number;
      isAdult: boolean;
      employmentStatus?: string;
      incomeSources: string[];
    }>;
  };
  consent: {
    releaseMedicalFinancial: boolean;
    contactPermission: boolean;
    noGuaranteeAcknowledgment: boolean;
    signature: string;
    signedAt: string;
  };
};
