import { known, type Profile } from "./profile";

export const researchVersion = "2026-09-17-preview-2";
const sharedFields = [
  "firstName",
  "lastName",
  "dob",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "members",
  "annualIncome",
  "monthlyIncome",
];
type DocumentRequirement = {
  id: string;
  label: string;
  types: string[];
  applicability: string;
  conditional?: boolean;
  whenFact?: string;
};
export type Program = {
  reviewRequired?: boolean;
  role?: string;
  why?: string;
  submissionInstructions?: string;
  renewalDays?: number;
  id: string;
  name: string;
  applicationId: string;
  url: string;
  fields: string[];
  reviews: string[];
  sources: { label: string; url: string }[];
  documents: DocumentRequirement[];
};
const utilityDocs: DocumentRequirement[] = [
  {
    id: "utility-bill",
    label: "Current utility bill",
    types: ["utility_bill"],
    applicability:
      "Check last 30 days, service address and account holder; alternative fuel/payment routes need review.",
  },
  {
    id: "identity",
    label: "Identity evidence",
    types: ["photo_id"],
    applicability:
      "Confirm accepted identity option. Enter sensitive identifiers directly with DES where possible.",
  },
  {
    id: "income",
    label: "Income evidence — last 30 days",
    types: ["paystub", "benefit_letter", "proof_of_income"],
    conditional: true,
    applicability:
      "Confirm income sources and covered dates. LIHEAP may allow a categorical income exception; Power AZ does not. Do not request every proof alternative.",
  },
  {
    id: "shutoff",
    label: "Shutoff notice / service-off evidence",
    types: ["shutoff_notice"],
    whenFact: "shutoff",
    applicability:
      "Confirm the actual deadline and current service status with the patient/provider. Urgent contact comes before completing the packet.",
  },
];
const utilityReviews = [
  "Confirm Arizona service location, energy household, eligible members and last-30-day income. Existing household and income totals cannot establish eligibility.",
  "Review status/residency, tribal route, benefit history, and crisis rules with DES. Do not assume identical rules for the two programs.",
  "Select applicable proof only: income, residence/status, lease or subsidy, and shutoff notice if relevant. Confirm dates and evidence alternatives before requesting documents.",
];
export const programs: Program[] = [
  {
    id: "mayo-az",
    name: "Mayo Clinic Arizona Financial Assistance",
    applicationId: "mayo-online",
    url: "https://www.mayoclinic.org/forms/financial-assistance-application",
    fields: [
      ...sharedFields,
      "facilities",
      "assistance",
      "employment",
      "insurance",
      "applicantFirstName",
      "applicantLastName",
      "responsiblePartyBirthDate",
      "assistanceNeed",
      "claimedOnAnotherTaxReturn",
      "appliedForGovernmentAssistance",
      "pendingClaim",
      "employerInsuranceAvailable",
      "dependentsDetails",
      "medicalDebtDetails",
    ],
    reviews: [
      "Confirm covered Mayo billing entity, insurance network, residency/status and policy exceptions. Mayo makes the eligibility decision.",
      "Confirm tax-family membership and tax-year income, employment details and applicable assets. Do not reuse a generic household count as Mayo's family count.",
      "Confirm applicant/responsible party and signing authority; legacy applicant fields may have defaulted to patient details. PCSN consent is not a signed official application.",
      "Choose applicable evidence: recent-month pay/bank statements, tax or benefit evidence and government-assistance decisions as appropriate. These are not all mandatory for every patient.",
      "Verify the document destination with Mayo before sending; public mailing instructions need clarification. Confirm receipt and arrange follow-up after actual submission.",
    ],
    documents: [
      {
        id: "medical-bill",
        label: "Medical bill / account evidence",
        types: ["medical_bill"],
        applicability:
          "Confirm this identifies the covered Mayo account; an uploaded bill may be for another facility.",
      },
      {
        id: "income",
        label: "Applicable income evidence",
        types: [
          "paystub",
          "tax_return",
          "w2",
          "benefit_letter",
          "proof_of_income",
        ],
        conditional: true,
        applicability:
          "Select the appropriate proof for each income source. Confirm tax year or recent-month coverage, owner and completeness; one uploaded file may cover only part of the requirement.",
      },
      {
        id: "bank",
        label: "Recent bank statement, if applicable",
        types: ["bank_statement"],
        conditional: true,
        applicability:
          "Confirm applicability and the recent-month period with Mayo before requesting a statement. Do not assume a bank account exists.",
      },
    ],
    sources: [
      {
        label: "Mayo policy",
        url: "https://mcforms.mayo.edu/mc5800-mc5899/mc5815-65.pdf",
      },
      {
        label: "Mayo evidence instructions",
        url: "https://www.mayoclinic.org/billing-insurance/financial-assistance/form-instructions",
      },
    ],
  },
  ...["liheap", "power-az"].map((id) => ({
    id,
    name: id === "liheap" ? "Arizona LIHEAP" : "Power AZ",
    applicationId: "az-des-direct-energy",
    url: "https://desportal.az.gov",
    fields: [
      ...sharedFields,
      "utilityNeed",
      "utilityProvider",
      "accountHolder",
      "serviceAddress",
      "shutoff",
      "utilitiesInRent",
    ],
    reviews: [
      ...utilityReviews,
      id === "liheap"
        ? "Review whether current DES Nutrition or Cash Assistance supports the LIHEAP categorical income route; do not assume the exception applies."
        : "Power AZ has no categorical income eligibility. Apply its own income ceiling, benefit-history and crisis rules; do not inherit the LIHEAP determination.",
    ],
    documents: utilityDocs,
    sources: [
      {
        label: "Shared direct application (August 2026)",
        url: "https://des.az.gov/sites/default/files/dl/EAP-1002A.pdf",
      },
      {
        label: id === "liheap" ? "LIHEAP policy" : "Power AZ policy",
        url:
          id === "liheap"
            ? "https://des.az.gov/sites/default/files/dl/CCSD-LIHEAP-Policy.pdf"
            : "https://des.az.gov/sites/default/files/dl/CCSD-Power-AZ-Policy.pdf",
      },
    ],
  })),
];

export const workflowStages = [
  "Identify assistance",
  "Collect facts",
  "Collect/reuse documents",
  "Prepare application",
  "Submit or refer",
  "Record submission",
  "Follow up",
  "Record outcome",
];

export function evaluateDocuments(profile: Profile, program: Program) {
  return program.documents
    .filter((d) => !d.whenFact || known(profile, d.whenFact) === "yes")
    .map((requirement) => {
      const candidates = profile.documents.filter((d) =>
        requirement.types.includes(d.type),
      );
      const reviews = candidates.flatMap((d) =>
        (d.reviews ?? []).filter(
          (r) =>
            r.programId === program.id && r.requirementId === requirement.id,
        ),
      );
      const available = reviews.some((r) => r.status === "available");
      // An unreviewed candidate means we cannot conclude that all evidence is outdated.
      const allOutdated =
        candidates.length > 0 &&
        candidates.every((d) =>
          (d.reviews ?? []).some(
            (r) =>
              r.programId === program.id &&
              r.requirementId === requirement.id &&
              r.status === "outdated",
          ),
        );
      const status = available
        ? "Available"
        : allOutdated
          ? "Outdated"
          : candidates.length || requirement.conditional
            ? "Needs review"
            : "Missing";
      return {
        ...requirement,
        uploaded: candidates.length > 0,
        status,
        sources: candidates.map((d) => d.source),
        reviewNotes: reviews.map((r) => r.note),
      };
    });
}

export function buildPlan(profile: Profile, publishedPrograms?: Program[]) {
  const facility = known(profile, "facilities")
    ?.split("; ")
    .some((f) => f.toLowerCase() === "mayo clinic arizona");
  const hospitalNeed = ["hospital", "both"].includes(
    known(profile, "assistance") ?? "",
  );
  const utilityNeed = known(profile, "utilityNeed") === "yes";
  return (publishedPrograms ?? programs)
    .filter((p) =>
      publishedPrograms
        ? true
        : p.id === "mayo-az"
          ? facility && hospitalNeed
          : utilityNeed,
    )
    .map((program) => {
      const facts = program.fields.map((key) => ({
        key,
        ...(profile.facts[key] ?? {
          label: key,
          state: "unknown" as const,
          evidence: [],
        }),
      }));
      const missing = facts.filter(
        (f) => f.state === "unknown" || f.state === "conflict",
      );
      const notApplicable = facts.filter((f) => f.state === "not_applicable");
      const evidence = evaluateDocuments(profile, program);
      const urgent =
        program.applicationId === "az-des-direct-energy" &&
        known(profile, "shutoff") === "yes";
      const priorityKeys =
        program.id === "mayo-az"
          ? [
              "applicantFirstName",
              "applicantLastName",
              "responsiblePartyBirthDate",
            ]
          : ["shutoff", "utilityProvider", "serviceAddress", "accountHolder"];
      const priorityFacts = [
        ...missing.filter((f) => priorityKeys.includes(f.key)),
        ...missing.filter((f) => !priorityKeys.includes(f.key)),
      ];
      const missingDocument = evidence.find(
        (d) => d.status === "Missing" || d.status === "Outdated",
      );
      const nextQuestion = priorityFacts.length
        ? `Ask the patient to clarify: ${priorityFacts
            .slice(0, 3)
            .map((f) => f.label.toLowerCase())
            .join(
              ", ",
            )}. Reuse the available answers; review the remaining checklist before requesting more.`
        : missingDocument
          ? `Ask the patient for ${missingDocument.status === "Outdated" ? "a current replacement for " : ""}${missingDocument.label.toLowerCase()}. First check unclassified uploads and the shared evidence list to avoid requesting a duplicate.`
          : "Review the available facts and document ownership/dates against the official application. Confirm the applicable evidence and unresolved program rules before applying.";
      const routingKeys =
        publishedPrograms &&
        !["mayo-az", "liheap", "power-az"].includes(program.id)
          ? program.fields
          : program.id === "mayo-az"
            ? ["firstName", "lastName", "assistanceNeed"]
            : ["state", "serviceAddress", "utilityProvider"];
      const routingKnown = routingKeys.every(
        (key) => known(profile, key) !== undefined,
      );
      const state = known(profile, "state")?.toUpperCase();
      const arizonaUnconfirmed =
        program.applicationId === "az-des-direct-energy" &&
        state !== "AZ" &&
        state !== "ARIZONA";
      const suggestedStage = missing.length
        ? 1
        : evidence.some((d) => d.status !== "Available")
          ? 2
          : 3;
      return {
        ...program,
        screening: !routingKnown
          ? "More information needed"
          : notApplicable.length || arizonaUnconfirmed || program.reviewRequired
            ? "Review recommended"
            : "Potential match",
        suggestedStage,
        workflow: workflowStages[suggestedStage],
        progress: "Not tracked in this preview",
        role:
          program.role ??
          "PCSN helps patient apply — proposed pilot role; confirm before proceeding",
        why:
          program.why ??
          (program.id === "mayo-az"
            ? "The intake lists Mayo Clinic Arizona and requests hospital bill assistance. This supports reviewing the route, not an eligibility decision."
            : "The patient explicitly reported trouble paying electricity or gas. Confirm the Arizona service location and DES rules before applying."),
        available: facts.filter((f) => f.state === "known"),
        notApplicable,
        missing,
        evidence,
        urgent,
        next: urgent
          ? "Contact the patient about the shutoff deadline and help contact DES/provider promptly; do not wait for a complete packet."
          : nextQuestion,
        owner:
          "Volunteer (unassigned); patient supplies or confirms missing information",
      };
    });
}
