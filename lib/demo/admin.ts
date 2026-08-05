import type { ApplicationStatus } from "@/lib/types";

export const demoSessionToken = "demo-admin-session";

export function isDemoMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

type DemoSubmission = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  clinic_name: string;
  annual_income: number;
  monthly_income: number;
  assistance_type: "manufacturer" | "hospital" | "both";
  medication_requested: string | null;
  provider_name: string;
  provider_npi: string;
  provider_phone: string;
  provider_fax: string | null;
  provider_address_line_1: string;
  provider_address_line_2: string | null;
  provider_city: string;
  provider_state: string;
  provider_postal_code: string;
  hospital_account_number: string | null;
  treatment_facilities: string[];
  cancer_type: string;
  missing_documents: string[];
  patients: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone: string;
    email: string;
  };
  household_members: Array<{
    name: string;
    relationship: string;
    age: number;
    isAdult: boolean;
    incomeSources: string[];
  }>;
  documents: Array<{
    id: string;
    original_filename: string;
    document_type: string;
  }>;
  admin_notes: Array<{
    id: string;
    note: string;
    created_at: string;
  }>;
};

const demoSubmissions: DemoSubmission[] = [
  {
    id: "demo-lena-morales",
    status: "missing_documents",
    created_at: "2026-05-12T16:20:00.000Z",
    updated_at: "2026-05-13T18:45:00.000Z",
    clinic_name: "Desert Oncology Center",
    annual_income: 38400,
    monthly_income: 3200,
    assistance_type: "both",
    medication_requested: "Palbociclib",
    provider_name: "Dr. Andrea Patel",
    provider_npi: "1234567890",
    provider_phone: "(602) 555-0181",
    provider_fax: "(602) 555-0182",
    provider_address_line_1: "1200 E Oncology Way",
    provider_address_line_2: "Suite 210",
    provider_city: "Phoenix",
    provider_state: "AZ",
    provider_postal_code: "85016",
    hospital_account_number: "HSP-240018",
    treatment_facilities: [
      "Banner MD Anderson Cancer Center",
      "Dignity Health Cancer Institute at St. Joseph's",
    ],
    cancer_type: "Breast cancer",
    missing_documents: ["Two recent pay stubs", "Insurance card, back"],
    patients: {
      first_name: "Lena",
      last_name: "Morales",
      date_of_birth: "1974-09-18",
      phone: "(602) 555-0134",
      email: "lena.morales@example.com",
    },
    household_members: [
      {
        name: "Lena Morales",
        relationship: "Patient",
        age: 51,
        isAdult: true,
        incomeSources: ["Part-time wages"],
      },
      {
        name: "Sofia Morales",
        relationship: "Daughter",
        age: 14,
        isAdult: false,
        incomeSources: [],
      },
    ],
    documents: [
      {
        id: "demo-doc-insurance-front",
        original_filename: "insurance-card-front.pdf",
        document_type: "insurance_card_front",
      },
      {
        id: "demo-doc-medical-bill",
        original_filename: "hospital-bill-april.pdf",
        document_type: "medical_bill",
      },
      {
        id: "demo-doc-denial",
        original_filename: "coverage-denial-letter.pdf",
        document_type: "prior_authorization_denial",
      },
    ],
    admin_notes: [
      {
        id: "demo-note-1",
        note: "Called patient. She expects to upload the missing pay stubs this week.",
        created_at: "2026-05-13T18:45:00.000Z",
      },
    ],
  },
  {
    id: "demo-david-chen",
    status: "under_review",
    created_at: "2026-05-10T14:05:00.000Z",
    updated_at: "2026-05-10T14:05:00.000Z",
    clinic_name: "Phoenix Hematology Group",
    annual_income: 27600,
    monthly_income: 2300,
    assistance_type: "manufacturer",
    medication_requested: "Imatinib",
    provider_name: "Dr. Marcus Hill",
    provider_npi: "1098765432",
    provider_phone: "(480) 555-0121",
    provider_fax: "(480) 555-0122",
    provider_address_line_1: "455 W Blood Disorders Pkwy",
    provider_address_line_2: null,
    provider_city: "Phoenix",
    provider_state: "AZ",
    provider_postal_code: "85012",
    hospital_account_number: null,
    treatment_facilities: ["Mayo Clinic Arizona"],
    cancer_type: "Leukemia",
    missing_documents: [],
    patients: {
      first_name: "David",
      last_name: "Chen",
      date_of_birth: "1961-02-03",
      phone: "(480) 555-0198",
      email: "david.chen@example.com",
    },
    household_members: [
      {
        name: "David Chen",
        relationship: "Patient",
        age: 65,
        isAdult: true,
        incomeSources: ["Social Security"],
      },
    ],
    documents: [
      {
        id: "demo-doc-med-list",
        original_filename: "medication-list.pdf",
        document_type: "prescription_or_medication_list",
      },
      {
        id: "demo-doc-award-letter",
        original_filename: "benefit-award-letter.pdf",
        document_type: "benefit_letter",
      },
    ],
    admin_notes: [],
  },
];

export function getDemoSubmissions() {
  return demoSubmissions;
}

export function getDemoSubmission(id: string) {
  return demoSubmissions.find((submission) => submission.id === id) ?? null;
}

export function updateDemoSubmission(
  id: string,
  input: {
    status: ApplicationStatus;
    missingDocuments: string[];
    note?: string;
  },
) {
  const submission = getDemoSubmission(id);
  if (!submission) return null;
  submission.status = input.status;
  submission.missing_documents = input.missingDocuments;
  submission.updated_at = new Date().toISOString();
  if (input.note?.trim()) {
    submission.admin_notes.unshift({
      id: `demo-note-${Date.now()}`,
      note: input.note.trim(),
      created_at: new Date().toISOString(),
    });
  }
  return submission;
}
