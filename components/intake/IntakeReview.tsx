import type { IntakePayload } from "@/lib/types";
import { financialNeedOptions } from "@/lib/intake/needs";
export function IntakeReview({
  form: f,
  documents,
}: {
  form: IntakePayload;
  documents: { original_filename: string }[];
}) {
  const rows: [string, string][] = [
    [
      "Patient",
      `${f.patient.firstName} ${f.patient.lastName} · Born ${f.patient.dateOfBirth}`,
    ],
    [
      "Contact",
      [
        f.patient.phone,
        f.patient.email,
        f.patient.addressLine1,
        f.patient.addressLine2,
        f.patient.city,
        f.patient.state,
        f.patient.postalCode,
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Requested assistance",
      financialNeedOptions
        .filter(([id]) => f.household.financialNeeds?.includes(id))
        .map(([, label]) => label)
        .join(", ") || f.assistanceType,
    ],
    [
      "Diagnosis",
      [
        f.diagnosis.cancerType,
        f.diagnosis.cancerStage,
        `Approximate diagnosis month: ${f.diagnosis.diagnosisDate}`,
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Treatments",
      f.diagnosis.treatments
        ?.map((t) => [t.name, t.startDate].filter(Boolean).join(" — "))
        .join(", ") || f.diagnosis.treatmentPlan,
    ],
    ["Facilities", f.hospital.treatmentFacilities?.join(", ") || ""],
    [
      "Hospital accounts",
      [f.hospital.accountNumber, f.hospital.guarantorNumber]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Care team",
      [f.provider.providerName, f.provider.clinicName, f.provider.phone]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Medications / pharmacy",
      [
        f.diagnosis.medications?.join(", ") || f.diagnosis.medicationRequested,
        f.diagnosis.pharmacyName,
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Insurance",
      f.insurance.hasInsurance
        ? [
            f.insurance.medicalCarrier,
            f.insurance.pharmacyCarrier,
            f.insurance.hasMedicare ? "Medicare" : "",
            f.insurance.hasMedicaid ? "Medicaid" : "",
            `Coverage denial: ${f.insurance.coverageDenied.replaceAll("_", " ")}`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "No insurance reported",
    ],
    [
      "Caregiver",
      f.representative.hasRepresentative
        ? [
            f.representative.firstName,
            f.representative.lastName,
            f.representative.relationship,
            f.representative.phone,
            f.representative.email,
          ]
            .filter(Boolean)
            .join(" · ")
        : "No caregiver reported",
    ],
    [
      "Household",
      `${f.household.householdSize} ${f.household.householdSize === 1 ? "person" : "people"}: ${f.household.members.map((m) => (m.relationship === "Patient" ? `${f.patient.firstName} (patient)` : `${m.name} (${m.relationship})`)).join(", ")}`,
    ],
    [
      "Income",
      `Monthly: ${f.household.monthlyIncome === "" ? "Not provided" : "$" + f.household.monthlyIncome}; Annual: ${f.household.annualIncome === "" ? "Not provided" : "$" + f.household.annualIncome}; Employment: ${f.patient.employmentStatus}`,
    ],
    [
      "Documents",
      documents.map((d) => d.original_filename).join(", ") ||
        "No documents uploaded; uploads are optional at this stage",
    ],
    ...(
      [
        ["volunteerAccessConsent", "Volunteer access to saved answers"],
        [
          "releaseMedicalFinancial",
          "Release of medical and financial information",
        ],
        ["contactPermission", "Permission to contact"],
        [
          "noGuaranteeAcknowledgment",
          "Acknowledgment that assistance is not guaranteed",
        ],
      ] as const
    ).map(([key, label]): [string, string] => [
      label,
      f.consent[key] ? "Yes" : "Not given",
    ]),
    ["Signature", f.consent.signature],
    [
      "Medical bills",
      f.financial?.bills
        .map(
          (b) =>
            `${b.facility || "Provider not supplied"}: ${b.kind}, amount ${b.amount || "unknown"}, service date ${b.serviceDate || "unknown"}, collections ${b.collections || "unknown"}`,
        )
        .join("; ") || "Not provided",
    ],
    [
      "Financial household details",
      f.financial
        ? `Married: ${f.financial.married || "unknown"}; Dependents: ${f.financial.hasDependents || "unknown"}; ${f.financial.income.map((i) => `${i.kind}: ${i.receives || "unknown"}${i.receives === "yes" ? `, ${i.amount || "unknown amount"} ${i.frequency}, ${i.source}` : ""}`).join("; ")}`
        : "Not provided",
    ],
  ];
  return (
    <section className="grid gap-4 rounded-md bg-white p-5">
      <h2 className="text-xl font-semibold">Review before sending</h2>
      <p>
        You have not submitted this request yet. Use the section links above to
        make corrections, then choose Submit application and confirm.
      </p>
      <dl className="grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="whitespace-pre-wrap break-words">
              {value || "Not provided"}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        PCSN volunteers can read saved answers with your permission. Sending
        this request does not submit an outside program application or guarantee
        funding.
      </p>
    </section>
  );
}
