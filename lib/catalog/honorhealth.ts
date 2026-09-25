import { blankEntry, type Entry } from "./model";
export const honorhealthSource =
  "https://www.honorhealth.com/sites/default/files/2026-02/enhanced-financial-assistance-disclosure-english.pdf";
/** Produces an editable draft only. Never changes the published pointer. */
export function prepareHonorHealthDraft(current: Entry[]): Entry[] {
  const existing = current.find(
    (e) =>
      e.kind === "program" &&
      /honorhealth/i.test(e.name) &&
      !/rehab/i.test(e.name),
  );
  const id = existing?.id || "honorhealth-financial-assistance";
  const entries = current.map((e) => ({ ...e }));
  const fields = [
    "firstName",
    "lastName",
    "dob",
    "phone",
    "address",
    "employment",
    "members",
    "annualIncome",
    "monthlyIncome",
  ];
  for (const key of fields)
    if (!entries.some((e) => e.kind === "question" && e.factKey === key))
      entries.push({
        ...blankEntry("question", `fact-${key}`),
        enabled: true,
        name: key,
        factKey: key,
        sourceUrl: honorhealthSource,
      });
  const documents: [string, string, string[], string][] = [
    [
      "income",
      "Applicable income evidence",
      ["paystub", "benefit_letter", "proof_of_income"],
      "Use the income sources the patient actually receives. Two pay stubs for wages; benefit/pension/government assistance records or a financial-support letter as applicable.",
    ],
    [
      "tax",
      "Previous year federal tax return",
      ["tax_return"],
      "Confirm availability and tax year.",
    ],
    [
      "w2",
      "Previous year W-2, if applicable",
      ["w2"],
      "Confirm employment and whether a W-2 applies.",
    ],
    [
      "bank",
      "Last two complete statements for every checking/savings account",
      ["bank_statement"],
      "Review account ownership, periods and every page. Two uploaded files do not prove two months for every account.",
    ],
    [
      "bills",
      "Outstanding medical bills from all providers",
      ["medical_bill"],
      "Review service dates within the previous 12 months and patient responsibility; estimates, EOBs and denials are not bills.",
    ],
  ];
  for (const [key, name, types, help] of documents) {
    const docId = `${id}-${key}`;
    const entry = {
      ...blankEntry("document", docId),
      enabled: true,
      name,
      documentTypes: types,
      conditional: true,
      help,
      sourceUrl: honorhealthSource,
    };
    const at = entries.findIndex((e) => e.id === docId);
    if (at < 0) entries.push(entry);
    else entries[at] = entry;
  }
  const program: Entry = {
    ...(existing || blankEntry("program", id)),
    enabled: true,
    manualOnly: false,
    name: "HonorHealth Financial Assistance",
    organization: "HonorHealth",
    applicationId: "honorhealth-enhanced",
    applicationUrl: honorhealthSource,
    sourceUrl: honorhealthSource,
    verifiedOn: "",
    verifiedBy: "",
    verificationNotes:
      "Prepared from official enhanced disclosure and April 2026 policy on 2026-09-23. Administrator must review and verify before publication.",
    questionIds: fields.map(
      (key) =>
        entries.find((e) => e.kind === "question" && e.factKey === key)!.id,
    ),
    documentIds: documents.map(([key]) => `${id}-${key}`),
    rules: [
      {
        fact: "honorhealthNeed",
        operator: "equals",
        value: "yes",
        purpose: "surface",
        explanation:
          "Reported HonorHealth treatment and medical bill assistance support reviewing this route.",
      },
    ],
    actionType: "helps",
    submissionInstructions:
      "Confirm covered provider and application route with HonorHealth. Use its official application and supporting evidence. MyChart offers secure submission; confirm any alternate destination from the official form. Record submission and arrange follow-up.",
    reviewNotes: [
      "Confirm covered services, guarantor/signing authority, family membership and income periods. PCSN consent is not the official HonorHealth authorization.",
      "Enter SSNs directly on the official application; do not collect them in this portal.",
      "Medically indigent screening is internal only. Confirm documented patient responsibility incurred during the previous 12 months against income for that year. HonorHealth determines eligibility.",
    ],
    renewalDays: 0,
  };
  return [...entries.filter((e) => e.id !== id), program];
}
