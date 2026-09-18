import { adaptSubmission, type Profile } from "./profile";

// Hand-authored fictional records. Never populated from database rows or live patient data.
const synthetic = {
  status: "approved",
  patients: {
    first_name: "Synthetic",
    last_name: "Example",
    date_of_birth: "1970-01-01",
    phone: "202-555-0100",
    email: "synthetic@example.invalid",
    address_line_1: "100 Example Street",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85000",
  },
  assistance_type: "hospital",
  treatment_facilities: ["Mayo Clinic Arizona"],
  household_size: 2,
  household_members: [{ name: "Example Partner", relationship: "Partner" }],
  monthly_income: 1200,
  annual_income: 25000,
  employment_status: "Part-time work",
  cancer_type: "Synthetic diagnosis",
  provider_name: "Example Care Team",
  medication_requested: "Synthetic medicine A",
  insurance_details: {
    medicalCarrier: "Example Health Plan",
    hasMedicalInsurance: true,
    medications: ["Synthetic medicine B"],
    mayoFinancialAssistance: {
      assistanceNeed: "Fictional difficulty paying a Mayo bill",
      applicantFirstName: "Synthetic",
      applicantLastName: "Example",
      responsiblePartyBirthDate: "1970-01-01",
      claimedOnAnotherTaxReturn: "no",
      appliedForGovernmentAssistance: "no",
      dependentsDetails:
        "No tax dependents reported; volunteer must confirm tax family",
      medicalDebtDetails: "Fictional Mayo bill; statement still needed",
      pendingClaim: "no",
      employerInsuranceAvailable: "no",
    },
  },
  documents: [
    { document_type: "tax_return" },
    { document_type: "paystub" },
    { document_type: "utility_bill" },
    { document_type: "internal_record:bank_statement" },
  ],
};
export const exampleIds = ["mayo", "utilities", "unknown"] as const;
export type ExampleId = (typeof exampleIds)[number];
export function exampleProfile(id: ExampleId): Profile {
  if (id === "unknown")
    return adaptSubmission({
      status: "approved",
      assistance_type: "manufacturer",
      patients: { first_name: "Synthetic", last_name: "Legacy Example" },
      insurance_details: {
        hasMedicalInsurance: false,
        mayoFinancialAssistance: {
          employerInsuranceAvailable: "not_sure",
          otherIncomeDetails: "not applicable",
        },
      },
    });
  const profile = adaptSubmission(synthetic);
  if (id === "utilities") {
    // Separate synthetic future facts, NOT a made-up interpretation of current intake fields.
    for (const [key, value] of [
      ["utilityNeed", "yes"],
      ["utilityProvider", "Example Electric (fictional)"],
      ["accountHolder", "Synthetic Example"],
      ["serviceAddress", "100 Example Street, Phoenix, AZ 85000 (fictional)"],
      ["utilitiesInRent", "no"],
      ["shutoff", "yes"],
    ]) {
      profile.facts[key] = {
        label: profile.facts[key].label,
        state: "known",
        evidence: [
          {
            source: `synthetic.example.${key} (not collected by current intake)`,
            value,
          },
        ],
      };
    }
  }
  // Simulated volunteer review only. These are never inferred from an upload label.
  const paystub = profile.documents.find((d) => d.type === "paystub");
  if (paystub)
    paystub.reviews = ["mayo-az", "liheap", "power-az"].map((programId) => ({
      programId,
      requirementId: "income",
      status: "available",
      note: "SYNTHETIC review: this example packet covers the requested income source, person and recent period for this route. Not an outside-program acceptance.",
    }));
  const bill = profile.documents.find((d) => d.type === "utility_bill");
  if (bill)
    bill.reviews = ["liheap", "power-az"].map((programId) => ({
      programId,
      requirementId: "utility-bill",
      status: "outdated",
      note: "SYNTHETIC review: the example bill is outside the requested 30-day period; request the current bill once for the shared application.",
    }));
  return profile;
}
