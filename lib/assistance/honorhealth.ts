import { financialSchema, incomeKinds } from "../intake/financial";
import { validMoney } from "../intake/validation";
export type ReadinessItem = {
  label: string;
  status: "Complete" | "Missing" | "Not applicable" | "Review needed";
  documents: string[];
  note?: string;
};
export function honorHealthReadiness(
  s: Record<string, unknown>,
  today = new Date().toISOString().slice(0, 10),
) {
  const p = (s.patients || {}) as Record<string, unknown>,
    insurance = (s.insurance_details || {}) as Record<string, unknown>;
  const result = financialSchema.safeParse(insurance.financial || {}),
    f = result.success ? result.data : financialSchema.parse({});
  const docs = (Array.isArray(s.documents) ? s.documents : []) as {
    id: string;
    document_type: string;
    original_filename: string;
  }[];
  const members = (
    Array.isArray(s.household_members) ? s.household_members : []
  ) as Record<string, unknown>[];
  const items: ReadinessItem[] = [];
  const fact = (label: string, complete: boolean) =>
    items.push({
      label,
      status: complete ? "Complete" : "Missing",
      documents: [],
    });
  const evidence = (
    label: string,
    types: string[],
    applies: "yes" | "no" | "unknown",
    note: string,
  ) => {
    const found = docs.filter((d) => types.includes(d.document_type));
    items.push({
      label,
      status:
        applies === "no"
          ? "Not applicable"
          : found.length || applies === "unknown"
            ? "Review needed"
            : "Missing",
      documents: found.map((d) => `${d.original_filename} (${d.id})`),
      note,
    });
  };
  fact(
    "Patient demographics",
    [
      "first_name",
      "last_name",
      "date_of_birth",
      "phone",
      "address_line_1",
    ].every((k) => Boolean(p[k])),
  );
  fact(
    "Marital / dependent information",
    ["yes", "no"].includes(f.married) &&
      ["yes", "no"].includes(f.hasDependents) &&
      (f.married !== "yes" ||
        members.some(
          (m) =>
            /spouse|wife|husband/i.test(String(m.relationship)) &&
            m.name &&
            m.dateOfBirth,
        )) &&
      (f.hasDependents !== "yes" ||
        members.some((m) => m.dependent === "yes" && m.name && m.dateOfBirth)),
  );
  fact(
    "Income-source information",
    incomeKinds.every((k) =>
      f.income.some(
        (i) =>
          i.kind === k &&
          (i.receives === "no" ||
            (i.receives === "yes" &&
              validMoney(i.amount) &&
              i.frequency &&
              i.source)),
      ),
    ),
  );
  for (const [kind, label, types] of [
    ["Employment wages", "Last two pay stubs", ["paystub"]],
    ["Social Security", "Social Security statement", ["benefit_letter"]],
    ["Pension", "Pension statement", ["benefit_letter", "proof_of_income"]],
    [
      "Government assistance",
      "Government assistance evidence",
      ["benefit_letter", "proof_of_income"],
    ],
    [
      "Regular financial gifts",
      "Financial support letter",
      ["proof_of_income", "other_documents"],
    ],
  ] as [string, string, string[]][]) {
    const receives = f.income.find((i) => i.kind === kind)?.receives;
    evidence(
      label,
      types,
      receives === "yes" ? "yes" : receives === "no" ? "no" : "unknown",
      "Confirm person, source, dates and completeness. An upload category alone is not proof.",
    );
  }
  evidence(
    "Previous year federal tax return",
    ["tax_return"],
    "unknown",
    "Confirm tax year and whether available.",
  );
  evidence(
    "Previous year W-2",
    ["w2"],
    f.income.find((i) => i.kind === "Employment wages")?.receives === "no"
      ? "no"
      : "unknown",
    "Confirm whether this tax-year document applies.",
  );
  evidence(
    "Two complete statements per checking/savings account",
    ["bank_statement"],
    f.hasBankAccounts === "no"
      ? "no"
      : f.hasBankAccounts === "yes"
        ? "yes"
        : "unknown",
    "Check every account, statement period and page. File count does not establish two months of coverage.",
  );
  evidence(
    "Outstanding medical bills from all providers",
    ["medical_bill"],
    "yes",
    "Check patient responsibility, duplicate statements and service dates during the previous 12 months.",
  );
  const monthly = validMoney(s.monthly_income)
    ? Number(String(s.monthly_income).replace(/[$,\s]/g, ""))
    : null;
  const annual = validMoney(s.annual_income)
    ? Number(String(s.annual_income).replace(/[$,\s]/g, ""))
    : null;
  const cutoff = new Date(today + "T00:00:00Z");
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const used = new Set<string>();
  let reportedBillTotal = 0,
    count = 0;
  for (const b of f.bills) {
    if (
      b.kind !== "bill" ||
      !validMoney(b.amount) ||
      !b.serviceDate ||
      b.serviceDate < cutoff.toISOString().slice(0, 10) ||
      b.serviceDate > today ||
      !b.documentId ||
      used.has(b.documentId) ||
      !docs.some(
        (d) => d.id === b.documentId && d.document_type === "medical_bill",
      ) ||
      b.insuranceProcessed !== "yes"
    )
      continue;
    used.add(b.documentId);
    reportedBillTotal += Number(b.amount.replace(/[$,\s]/g, ""));
    count++;
  }
  return {
    items,
    monthly,
    annual,
    estimatedAnnual: monthly === null ? null : monthly * 12,
    reportedBillTotal: count ? reportedBillTotal : null,
    ratio:
      count && annual !== null && annual > 0
        ? (reportedBillTotal / annual) * 100
        : null,
    ready: false,
  };
}
