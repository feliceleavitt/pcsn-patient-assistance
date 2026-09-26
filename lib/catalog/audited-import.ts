import ExcelJS from "exceljs";
import path from "node:path";
import JSZip from "jszip";
import { blankEntry, catalogSchema, type Entry } from "./model";

type Audit = { status: string; source: string; secondary: string; verified: string; note: string; safe: string };
const text = (value: unknown) => String(value ?? "").trim();
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 95);
const status = (value: string): Entry["verificationStatus"] =>
  value === "VERIFIED" ? "VERIFIED" : value === "VERIFIED WITH CORRECTION" ? "VERIFIED_WITH_CORRECTION" : value === "PARTIALLY VERIFIED" ? "PARTIALLY_VERIFIED" : value === "OUTDATED" ? "OUTDATED" : value === "CONFLICTING SOURCES" ? "CONFLICTING_SOURCES" : "MANUAL_REVIEW_REQUIRED";
const humanVerifiedOn = "2026-09-26";
const humanVerifier = "Felice Leavitt";
const verifiedProgramIds = new Set([
  "HOUSING-STCS", "MED-BANNER", "MED-COMMONSPIRIT", "MED-HH-BASIC", "MED-HH-ENH",
  "MED-MAYO-AZ", "MED-NAH", "MED-NW", "MED-TENET", "MED-TMC", "MED-VALLEYWISE",
  "MEDCOST-AMGEN", "MEDCOST-AZME", "MEDCOST-BMS", "MEDCOST-FOUNDATIONS",
  "MEDCOST-GENENTECH", "MEDCOST-JNJ", "MEDCOST-MERCK", "MEDCOST-NOVARTIS",
  "MEDCOST-PFIZER", "TRANSPORT-ACS", "TRANSPORT-AZFC", "UTILITY-LIHEAP",
]);
const liheapSource = "https://des.az.gov/digital-library/liheap-application-benefits-english";
const honorHealthApplication = "https://www.honorhealth.com/sites/default/files/2019-12/financial-assistance-application-eng.pdf";
const genentechFoundationForm = "https://www.gene.com/download/pdf/Genentech_Patient_Foundation_Prescriber_Foundation_Form.pdf";
const verifiedQuestionSources: Record<string, { source: string; note: string }> = Object.fromEntries([
  ...["BEN-001", "BEN-002", "HH-001", "HH-002", "HH-004", "HOUS-001", "HOUS-002", "HOUS-003", "INC-001", "INC-002", "INC-003", "INC-004", "INC-005", "INC-006", "PAT-008", "PAT-010", "UTIL-001", "UTIL-002", "UTIL-003", "UTIL-004", "UTIL-006", "UTIL-007", "UTIL-008"].map((id) => [id, { source: liheapSource, note: "Arizona DES LIHEAP Application for Benefits EAP-1002A, effective 2026-09-01." }]),
  ...["ADDR-001", "ADDR-002", "ADDR-003", "ADDR-004", "HH-001", "HH-002", "HH-004", "PAT-001", "PAT-002", "PAT-003", "PAT-005", "PAT-006", "PAT-007", "SITE-004", "SITE-005"].map((id) => [id, { source: honorHealthApplication, note: "HonorHealth Financial Assistance Application requests the applicable identity, contact, address, household, account, or supporting-document fact." }]),
  ["ADDR-007", { source: "https://azsos.gov/services/address-confidentiality-program/about-acp", note: "Arizona ACP participants use an assigned substitute address; agencies must accept it." }],
  ...["CANCER-001", "CANCER-004", "INS-001", "INS-007", "INS-008"].map((id) => [id, { source: genentechFoundationForm, note: "Genentech Patient Foundation prescriber form requests the applicable diagnosis, treatment, coverage, coverage-type, or denial fact." }]),
]);
const programCorrections: Record<string, Partial<Entry>> = {
  "MED-VALLEYWISE": {
    sourceUrl: "https://valleywisehealth.org/patients/financial-assistance-and-discount-program-updates/",
    applicationUrl: "https://valleywisehealth.org/patients/financial-assistance-and-discount-program-updates/",
    sourceNotes: "Current financial-assistance and uninsured-discount schedules changed for services on or after 2025-11-12; confirm the applicable schedule before routing.",
  },
  "MEDCOST-AZME": {
    sourceUrl: "https://www.azandmeapp.com/important-program-updates",
    applicationUrl: "https://www.azandmeapp.com/important-program-updates",
    sourceNotes: "Current eligibility and product availability vary by insurance type. AZ&Me stopped accepting new patients for FARXIGA and XIGDUO XR on 2026-05-01; confirm current product-specific eligibility before routing.",
  },
  "MEDCOST-NOVARTIS": {
    sourceUrl: "https://pap.novartis.com/",
    applicationUrl: "https://pap.novartis.com/",
    sourceNotes: "Current NPAF workflow distinguishes insurance status; the Patient Enrollment Portal applies to applications on or after 2026-07-27. Confirm product and coverage routing before enrollment.",
  },
  "MEDCOST-FOUNDATIONS": {
    name: "Independent charitable foundations (referral/resource)",
    sourceNotes: "Referral/resource category only. Fund availability and eligibility are determined by each independent foundation and must be confirmed at the time of referral.",
  },
  "UTILITY-LIHEAP": {
    name: "Arizona LIHEAP Utility Assistance",
    sourceUrl: "https://des.az.gov/liheap",
    applicationUrl: "https://des.az.gov/liheap",
    sourceNotes: "Arizona LIHEAP remains active. Power AZ exhausted funds and stopped accepting new applications after 2026-09-21; it is not represented as an open route.",
  },
};
const action = (instructions: string, hold: boolean): Entry["routeActionType"] => {
  const v = instructions.toLowerCase();
  if (/financial counselor/.test(v)) return "CONTACT_FINANCIAL_COUNSELOR";
  if (/provider.*submit|provider-submitted|provider enrollment/.test(v)) return "PROVIDER_SUBMISSION_REQUIRED";
  if (/call|contact case manager/.test(v)) return "CALL_FOR_SCREENING";
  if (/patient and provider complete/.test(v)) return "ENROLL";
  if (/apply/.test(v) && !hold) return "APPLY";
  return "VIEW_PROGRAM";
};
function sheet(book: ExcelJS.Workbook, name: string) {
  const s = book.getWorksheet(name);
  if (!s) throw new Error(`Audited workbook is missing ${name}.`);
  return s;
}
function rows(s: ExcelJS.Worksheet) {
  return Array.from({ length: s.rowCount }, (_, i) =>
    Array.from({ length: s.columnCount }, (_, j) => text(s.getCell(i + 1, j + 1).text)),
  );
}
function headerIndex(data: string[][], header: string) {
  const row = data.findIndex((r) => r.includes(header));
  if (row < 0) throw new Error(`Could not find ${header} header.`);
  return { row, col: data[row].indexOf(header) };
}
async function normalizeAuditedWorkbook(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  let total = 0;
  for (const file of Object.values(zip.files)) {
    total += (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    if (total > 25_000_000) throw new Error("Audited workbook exceeds the supported expanded size.");
    if (file.dir || !/\.(xml|rels)$/.test(file.name)) continue;
    let xml = await file.async("string");
    if (file.name.endsWith(".rels")) {
      const owner = file.name.replace("_rels/", "").replace(/\.rels$/, "");
      xml = xml.replace(/Target="\/([^" ]+)"/g, (_, target) => `Target="${path.posix.relative(path.posix.dirname(owner), target)}"`);
    }
    const prefix = xml.match(/xmlns:([A-Za-z0-9_]+)="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/)?.[1];
    if (prefix) xml = xml.replace(new RegExp(`(<\\/?)(?:${prefix}):`, "g"), "$1").replace(new RegExp(`xmlns:${prefix}=`, "g"), "xmlns=");
    zip.file(file.name, xml);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

/**
 * Converts audited workbooks to draft entries. It never stamps, clears, or
 * invents verification data; the audit sheet is the source of truth.
 */
export async function importAuditedCatalogs(
  masterBytes: Buffer,
  routeBytes: Buffer,
  auditBytes: Buffer,
  existing: Entry[] = [],
) {
  const [master, routeBook, auditBook] = await Promise.all([masterBytes, routeBytes, auditBytes].map(async (bytes) => {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load((await normalizeAuditedWorkbook(bytes)) as never);
    return book;
  }));
  const auditRows = rows(sheet(auditBook, "Audit Log"));
  const auditHeader = headerIndex(auditRows, "Record type");
  const audits = new Map<string, Audit>();
  for (const row of auditRows.slice(auditHeader.row + 1)) {
    const id = row[auditHeader.col + 1];
    if (!id) continue;
    audits.set(id, { status: row[auditHeader.col + 7], source: row[auditHeader.col + 8], secondary: row[auditHeader.col + 9], verified: row[auditHeader.col + 11], note: [row[auditHeader.col + 12], row[auditHeader.col + 15]].filter(Boolean).join(" "), safe: row[auditHeader.col + 14] });
  }
  const entries = new Map(existing.map((entry) => [entry.id, entry]));
  const routeRows = rows(sheet(routeBook, "Assistance Routes"));
  const routeHeader = headerIndex(routeRows, "Route ID");
  // These aliases link the audited route catalog's human-readable route names
  // to the stable Program IDs in the master inventory. They avoid inventing
  // programs when route and inventory labels intentionally differ.
  const routeProgramIds: Record<string, string> = {
    B10: "MED-ONVIDA",
    B11: "NAV-DHO-FIN",
    C16: "MEDCOST-LILLY",
    C17: "MEDCOST-EMD-COVERONE",
    C18: "MEDCOST-TEVA-CARES",
    C19: "MEDCOST-AUTOLUS-AUCATZYL",
    C20: "MEDCOST-AVEO-PAP",
    C21: "MEDCOST-AVEO-COPAY",
    C22: "MEDCOST-AVEO-BRIDGE",
    C23: "MEDCOST-AVEO-QUICKSTART",
    C24: "MEDCOST-GERON-RYTELO",
  };
  const routeDetails = new Map<string, { routeId: string; instructions: string; requiredData: string }>();
  for (const row of routeRows.slice(routeHeader.row + 1)) {
    const routeId = row[routeHeader.col];
    const programId = routeProgramIds[routeId];
    if (programId) routeDetails.set(programId, { routeId, requiredData: row[routeHeader.col + 5], instructions: row[routeHeader.col + 6] });
  }
  const programRows = rows(sheet(master, "Program Catalog"));
  const programHeader = headerIndex(programRows, "Program ID");
  for (const row of programRows.slice(programHeader.row + 1)) {
    const id = row[programHeader.col];
    if (!id) continue;
    const a = audits.get(id);
    const instructions = routeDetails.get(id)?.instructions || row[programHeader.col + 9];
    const requiredData = routeDetails.get(id)?.requiredData || row[programHeader.col + 5];
    const hold = a?.safe === "No" || /do not expose|manual review|information only/i.test(a?.note ?? "");
    // The audited route catalog explicitly limits this route to commercial
    // insurance. It is the only imported hard exclusion; all other criteria
    // remain screening facts until a current source supports a hard rule.
    const rules = id === "MEDCOST-AVEO-COPAY"
      ? [{ fact: "insurance", operator: "equals" as const, value: "commercial", purpose: "surface" as const, explanation: "Current AVEO Copay Assistance is limited to commercially insured patients." }]
      : [];
    const current = entries.get(id);
    const humanVerified = verifiedProgramIds.has(id);
    entries.set(id, {
      ...(current ?? blankEntry("program", id)), id, kind: "program",
      name: row[programHeader.col + 2] || current?.name || id,
      organization: row[programHeader.col + 3],
      description: row[programHeader.col + 4],
      sourceUrl: programCorrections[id]?.sourceUrl || a?.source || row[programHeader.col + 12],
      secondarySourceUrl: a?.secondary || "",
      verifiedOn: humanVerified ? humanVerifiedOn : a?.verified || "",
      lastVerifiedAt: humanVerified ? humanVerifiedOn : a?.verified || "",
      verifiedBy: humanVerified ? humanVerifier : a?.verified ? "PCSN/admin" : "",
      verificationStatus: humanVerified ? "VERIFIED" : status(a?.status ?? ""),
      verificationNotes: humanVerified ? "Current authoritative source reviewed 2026-09-26." : "",
      sourceNotes: programCorrections[id]?.sourceNotes || a?.note || "",
      implementationHold: hold,
      eligibilityMode: rules.length ? "hard_rule" : hold || a?.status === "PARTIALLY VERIFIED" ? "manual_review" : "screening_only",
      providerRequired: /provider.*(?:submit|enrollment|required)|patient and provider complete/.test(`${instructions} ${a?.note ?? ""}`.toLowerCase()),
      billingEntityRequired: /billing entity|medical bill|account|bill\/entity/.test(`${requiredData} ${a?.note ?? ""}`.toLowerCase()),
      routeActionType: action(instructions, hold),
      applicationUrl: programCorrections[id]?.applicationUrl || a?.source || row[programHeader.col + 12],
      applicationId: id,
      submissionInstructions: instructions,
      rules,
      // Audited programs may be previewed by volunteers; lack of public
      // executable criteria keeps them in manual review rather than implying eligibility.
      enabled: true,
      ...programCorrections[id],
      manualOnly: true,
    });
  }
  const questionRows = rows(sheet(master, "Master Intake Fields"));
  const questionHeader = headerIndex(questionRows, "Field ID");
  for (const row of questionRows.slice(questionHeader.row + 1)) {
    const id = row[questionHeader.col];
    if (!id || entries.has(id)) continue;
    const a = audits.get(id);
    const verified = verifiedQuestionSources[id];
    entries.set(id, { ...blankEntry("question", id), name: row[questionHeader.col + 2], description: row[questionHeader.col + 4], help: row[questionHeader.col + 9], factKey: `catalog_${slug(id).replaceAll("-", "_")}`, conditional: !/^always$/i.test(row[questionHeader.col + 5]), sourceUrl: verified?.source || a?.source || "", verifiedOn: verified ? humanVerifiedOn : a?.verified || "", lastVerifiedAt: verified ? humanVerifiedOn : a?.verified || "", verifiedBy: verified ? humanVerifier : a?.verified ? "PCSN/admin" : "", verificationStatus: verified ? "VERIFIED" : status(a?.status ?? ""), verificationNotes: verified ? "Current authoritative source reviewed 2026-09-26." : "", sourceNotes: verified?.note || a?.note || "", enabled: false });
  }
  // Coverage presence and coverage category are distinct reusable facts. The
  // latter is necessary for manufacturer rules that distinguish commercial
  // from Medicare, Medicaid, other government coverage, and no coverage.
  entries.set("INS-008", {
    ...blankEntry("question", "INS-008"),
    name: "What type of health insurance do you have?",
    description: "Coverage category for program routing; this supplements, and does not replace, the general insurance-presence question.",
    factKey: "insuranceCategory",
    answerType: "choice",
    options: ["commercial", "medicare", "medicaid", "government", "uninsured"],
    sourceUrl: verifiedQuestionSources["INS-008"].source,
    verifiedOn: humanVerifiedOn,
    lastVerifiedAt: humanVerifiedOn,
    verifiedBy: humanVerifier,
    verificationStatus: "VERIFIED",
    verificationNotes: "Current authoritative source reviewed 2026-09-26.",
    sourceNotes: verifiedQuestionSources["INS-008"].note,
    enabled: true,
  });
  const documentRows = rows(sheet(master, "Documents & Consent"));
  const documentHeader = headerIndex(documentRows, "ID");
  for (const row of documentRows.slice(documentHeader.row + 1)) {
    const id = row[documentHeader.col];
    if (!id || entries.has(id)) continue;
    entries.set(id, { ...blankEntry("document", id), name: row[documentHeader.col + 1], description: row[documentHeader.col + 3], help: row[documentHeader.col + 4], documentTypes: [slug(id).replaceAll("-", "_")], conditional: true, enabled: false });
  }
  const crosswalkRows = rows(sheet(master, "Question Crosswalk"));
  const crosswalkHeader = headerIndex(crosswalkRows, "Program ID");
  for (const row of crosswalkRows.slice(crosswalkHeader.row + 1)) {
    const program = entries.get(row[crosswalkHeader.col]);
    if (!program || program.kind !== "program") continue;
    const questionIds = row[crosswalkHeader.col + 2].split(/\s*,\s*/).filter((id) => entries.get(id)?.kind === "question");
    // These IDs are explicitly approved canonical fields in the audited
    // crosswalk. Enable only the fields actually required by a mapped program;
    // unrelated inventory fields remain inactive drafts.
    for (const id of questionIds) {
      const question = entries.get(id);
      if (question?.kind === "question") entries.set(id, { ...question, enabled: true });
    }
    entries.set(program.id, { ...program, questionIds: [...new Set([...program.questionIds, ...questionIds])] });
  }
  const aveoCopay = entries.get("MEDCOST-AVEO-COPAY");
  if (aveoCopay?.kind === "program")
    entries.set(aveoCopay.id, { ...aveoCopay, questionIds: [...new Set([...aveoCopay.questionIds, "INS-008"])], rules: [{ fact: "insuranceCategory", operator: "equals", value: "commercial", purpose: "surface", explanation: "Current AVEO Copay Assistance is limited to commercially insured patients." }] });
  // The audited crosswalk used NEED-003 for AVEO Bridge and Quick Start, but
  // current AVEO enrollment materials do not require a medication deadline.
  // Keep the broader triage question as an inactive draft until separate,
  // source-backed utility-crisis and medication-deadline questions are needed.
  // HonorHealth Enhanced and Mayo Arizona likewise do not establish the
  // tax-household concept of HH-005; their mapped household requirements use
  // other, already verified canonical facts.
  for (const id of ["MEDCOST-AVEO-BRIDGE", "MEDCOST-AVEO-QUICKSTART", "MED-HH-ENH", "MED-MAYO-AZ"]) {
    const program = entries.get(id);
    if (program?.kind === "program")
      entries.set(id, { ...program, questionIds: program.questionIds.filter((questionId) => questionId !== "NEED-003" && questionId !== "HH-005") });
  }
  for (const id of ["NEED-003", "HH-005"]) {
    const question = entries.get(id);
    if (question?.kind === "question") entries.set(id, { ...question, enabled: false });
  }
  const drugRows = rows(sheet(master, "Oncology Drug PAP"));
  const drugHeader = headerIndex(drugRows, "Brand drug");
  const drugPrograms = new Map<string, string>();
  for (const row of drugRows.slice(drugHeader.row + 1)) {
    const name = row[drugHeader.col];
    if (!name) continue;
    const id = `drug-${slug(name)}`;
    if (!entries.has(id)) entries.set(id, { ...blankEntry("drug", id), name, organization: row[drugHeader.col + 3], sourceUrl: row[drugHeader.col + 5], enabled: false });
    drugPrograms.set(id, row[drugHeader.col + 4]);
  }
  // Product links come from the audited workbook's program column, not broad
  // manufacturer-name matching. This preserves product-specific support routes
  // and keeps AVEO's four distinct routes associated with FOTIVDA.
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [drugId, label] of drugPrograms) {
    if (!label) continue;
    const programs = [...entries.values()].filter((entry) => entry.kind === "program" && (
      normalize(entry.name) === normalize(label) ||
      (normalize(label).includes("aveoace") && /^MEDCOST-AVEO-/.test(entry.id))
    ));
    for (const program of programs) entries.set(program.id, { ...program, drugIds: [...new Set([...program.drugIds, drugId])] });
  }
  const facilityRows = rows(sheet(master, "AZ Facilities"));
  const facilityHeader = headerIndex(facilityRows, "Facility");
  for (const row of facilityRows.slice(facilityHeader.row + 1)) {
    const name = row[facilityHeader.col];
    if (!name) continue;
    const id = `facility-${slug(name)}`;
    if (entries.has(id)) continue;
    entries.set(id, { ...blankEntry("facility", id), name, organization: row[facilityHeader.col + 3], location: [row[facilityHeader.col + 1], row[facilityHeader.col + 2]].filter(Boolean).join(", "), sourceUrl: row[facilityHeader.col + 6], enabled: false });
  }
  const facilityProgramIds: Record<string, string[]> = {
    "MED-ONVIDA": ["facility-yuma-regional-medical-center-onvida-health"],
    "NAV-DHO-FIN": ["facility-desert-hematology-oncology"],
  };
  for (const [programId, facilityIds] of Object.entries(facilityProgramIds)) {
    const program = entries.get(programId);
    if (program?.kind === "program") entries.set(programId, { ...program, facilityIds: facilityIds.filter((id) => entries.get(id)?.kind === "facility") });
  }
  // Route rows enrich the matching Program ID where present; no duplicate route program is created.
  for (const [programId, detail] of routeDetails) {
    const program = entries.get(programId);
    if (program?.kind === "program") entries.set(programId, { ...program, routeId: detail.routeId });
  }
  const parsed = catalogSchema.parse([...entries.values()]);
  return { entries: parsed, counts: parsed.reduce((a, e) => ({ ...a, [e.kind]: (a[e.kind] ?? 0) + 1 }), {} as Record<string, number>), warnings: ["Imported as a disabled draft. Audited verification metadata was preserved. No program was published or enabled."] };
}
