/** Read-only, deliberately small projection. Never spread a patient/insurance record. */
export type Fact = {
  label: string;
  state: "known" | "unknown" | "not_applicable" | "conflict";
  evidence: { source: string; value: string }[];
  note?: string;
};
export type Profile = {
  facts: Record<string, Fact>;
  documents: {
    type: string;
    source: string;
    /** Only explicit, route-specific review can make a document reusable. Legacy uploads have none. */
    reviews?: {
      programId: string;
      requirementId: string;
      status: "available" | "outdated";
      note: string;
    }[];
  }[];
};
export const profileSections = [
  {
    label: "Identity and contact",
    keys: [
      "firstName",
      "lastName",
      "dob",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zip",
    ],
  },
  {
    label: "Household",
    keys: [
      "members",
      "householdSize",
      "dependentsDetails",
      "claimedOnAnotherTaxReturn",
    ],
  },
  { label: "Diagnosis and treatment", keys: ["diagnosis", "treatment"] },
  { label: "Facilities and providers", keys: ["facilities", "provider"] },
  {
    label: "Insurance",
    keys: ["insurance", "hasMedicalInsurance", "employerInsuranceAvailable"],
  },
  { label: "Medications and pharmacy", keys: ["medications", "pharmacy"] },
  { label: "Employment", keys: ["employment"] },
  {
    label: "Income and benefits",
    keys: ["annualIncome", "monthlyIncome", "otherIncomeDetails"],
  },
  {
    label: "Financial needs",
    keys: ["assistance", "assistanceNeed", "medicalDebtDetails", "utilityNeed"],
  },
];
const notApplicable = (value: string) =>
  /^(n\/a|not applicable|not_applicable)$/i.test(value);
type Row = Record<string, unknown>;
const row = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
function text(value: unknown): string | undefined {
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number")
    return Number.isFinite(value) && value >= 0 ? String(value) : undefined;
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return !clean || /^(unknown|not_sure|not sure|i don'?t know)$/i.test(clean)
    ? undefined
    : clean;
}
function strings(value: unknown) {
  return Array.isArray(value)
    ? value.map(text).filter((v): v is string => Boolean(v))
    : [];
}
export function adaptSubmission(input: unknown): Profile {
  const s = row(input),
    p = row(s.patients),
    insurance = row(s.insurance_details);
  const mayo = row(insurance.mayoFinancialAssistance);
  const facts: Profile["facts"] = {};
  function add(
    key: string,
    label: string,
    entries: [string, unknown][],
    note?: string,
  ) {
    const evidence = entries.flatMap(([source, raw]) => {
      const value = typeof raw === "string" ? raw.trim() : text(raw);
      return !value && value !== "0" ? [] : [{ source, value: value! }];
    });
    const answers = evidence.filter((e) => text(e.value) !== undefined);
    const distinct = new Set(answers.map((e) => e.value.toLowerCase()));
    facts[key] = {
      label,
      state: !answers.length
        ? "unknown"
        : distinct.size > 1 || answers.length !== evidence.length
          ? "conflict"
          : notApplicable(answers[0].value)
            ? "not_applicable"
            : "known",
      evidence,
      note,
    };
  }
  for (const [key, label, field] of [
    ["firstName", "First name", "first_name"],
    ["lastName", "Last name", "last_name"],
    ["dob", "Date of birth", "date_of_birth"],
    ["phone", "Phone", "phone"],
    ["email", "Email", "email"],
    ["address", "Street address", "address_line_1"],
    ["city", "City", "city"],
    ["state", "State", "state"],
    ["zip", "ZIP code", "postal_code"],
  ])
    add(key, label, [[`patients.${field}`, p[field]]]);
  add("facilities", "Arizona care sites", [
    [
      "submissions.treatment_facilities",
      strings(s.treatment_facilities).join("; "),
    ],
  ]);
  add("assistance", "Requested assistance", [
    ["submissions.assistance_type", s.assistance_type],
  ]);
  add("diagnosis", "Diagnosis", [["submissions.cancer_type", s.cancer_type]]);
  add("treatment", "Treatment plan", [
    ["submissions.treatment_plan", s.treatment_plan],
  ]);
  add("provider", "Treating provider", [
    ["submissions.provider_name", s.provider_name],
  ]);
  add("pharmacy", "Pharmacy", [
    ["submissions.insurance_details.pharmacyName", insurance.pharmacyName],
  ]);
  add(
    "hasMedicalInsurance",
    "Medical insurance reported",
    [
      [
        "submissions.insurance_details.hasMedicalInsurance",
        insurance.hasMedicalInsurance,
      ],
    ],
    "Legacy boolean defaults may not reflect an explicit patient answer; confirm before applying a coverage rule.",
  );
  add("employment", "Employment status", [
    ["submissions.employment_status", s.employment_status],
  ]);
  add(
    "annualIncome",
    "Reported annual income",
    [["submissions.annual_income", s.annual_income]],
    "Year, gross/net basis and included people are unconfirmed. Do not treat this as tax-year income.",
  );
  add(
    "monthlyIncome",
    "Reported monthly income",
    [["submissions.monthly_income", s.monthly_income]],
    "Dates and included people are unconfirmed. Do not annualize or treat as the last 30 days.",
  );
  add(
    "householdSize",
    "Reported household size",
    [["submissions.household_size", s.household_size]],
    "Not a confirmed tax-family or energy-household count.",
  );
  const members = Array.isArray(s.household_members)
    ? s.household_members.map(row)
    : [];
  add(
    "members",
    "Reported household members",
    [
      [
        "submissions.household_members",
        members
          .map((m) =>
            [text(m.name), text(m.relationship)].filter(Boolean).join(" — "),
          )
          .filter(Boolean)
          .join("; "),
      ],
    ],
    "Confirm tax dependency or shared energy costs for the chosen program. Do not infer birth dates from ages.",
  );
  add(
    "medications",
    "Medicines",
    [
      [
        "submissions.medication_requested",
        strings(
          typeof s.medication_requested === "string"
            ? s.medication_requested.split(";")
            : [],
        ).join("; "),
      ],
      [
        "submissions.insurance_details.medications",
        strings(insurance.medications).join("; "),
      ],
    ],
    "Different legacy copies require volunteer reconciliation; neither automatically wins.",
  );
  add("insurance", "Medical insurer", [
    ["submissions.insurance_details.medicalCarrier", insurance.medicalCarrier],
  ]);
  for (const [key, label] of [
    ["applicantFirstName", "Applicant first name"],
    ["applicantLastName", "Applicant last name"],
    ["responsiblePartyBirthDate", "Responsible party birth date"],
    ["assistanceNeed", "Medical financial need"],
    ["claimedOnAnotherTaxReturn", "Claimed on another tax return"],
    [
      "appliedForGovernmentAssistance",
      "Government medical assistance application",
    ],
    ["pendingClaim", "Pending claim or settlement"],
    ["employerInsuranceAvailable", "Employer insurance available"],
    ["dependentsDetails", "Dependent details"],
    ["medicalDebtDetails", "Medical debt details"],
    ["otherIncomeDetails", "Other income / benefits details"],
  ])
    add(key, label, [
      [
        `submissions.insurance_details.mayoFinancialAssistance.${key}`,
        mayo[key],
      ],
    ]);
  // These are unsupported by today's intake. A missing branch is not a negative answer.
  for (const [key, label] of [
    ["utilityNeed", "Trouble paying electricity or gas"],
    ["utilityProvider", "Utility provider"],
    ["accountHolder", "Utility account holder"],
    ["serviceAddress", "Utility service address"],
    ["shutoff", "Service off or shutoff notice"],
    ["utilitiesInRent", "Utilities included in rent"],
  ])
    add(key, label, [], "Not collected by the existing intake.");
  const documents = (Array.isArray(s.documents) ? s.documents : []).flatMap(
    (raw, index) => {
      const d = row(raw);
      const type = text(d.document_type);
      if (!type || type.startsWith("internal_record:")) return [];
      return [
        { type, source: `submissions.documents[${index}].document_type` },
      ];
    },
  );
  return { facts, documents };
}

export function known(profile: Profile, key: string): string | undefined {
  const fact = profile.facts[key];
  return fact?.state === "known" ? fact.evidence[0]?.value : undefined;
}
