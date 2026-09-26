import ExcelJS from "exceljs";
import { blankEntry, catalogSchema, type Entry } from "./model";

type Audit = { status: string; source: string; secondary: string; verified: string; note: string; safe: string };
const text = (value: unknown) => String(value ?? "").trim();
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 95);
const status = (value: string): Entry["verificationStatus"] =>
  value === "VERIFIED" ? "VERIFIED" : value === "VERIFIED WITH CORRECTION" ? "VERIFIED_WITH_CORRECTION" : value === "PARTIALLY VERIFIED" ? "PARTIALLY_VERIFIED" : value === "OUTDATED" ? "OUTDATED" : value === "CONFLICTING SOURCES" ? "CONFLICTING_SOURCES" : "MANUAL_REVIEW_REQUIRED";
const action = (instructions: string, hold: boolean): Entry["routeActionType"] => {
  const v = instructions.toLowerCase();
  if (/financial counselor/.test(v)) return "CONTACT_FINANCIAL_COUNSELOR";
  if (/provider.*submit|provider-submitted|provider enrollment/.test(v)) return "PROVIDER_SUBMISSION_REQUIRED";
  if (/call/.test(v)) return "CALL_FOR_SCREENING";
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
    await book.xlsx.load(bytes as never);
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
  const programRows = rows(sheet(master, "Program Catalog"));
  const programHeader = headerIndex(programRows, "Program ID");
  for (const row of programRows.slice(programHeader.row + 1)) {
    const id = row[programHeader.col];
    if (!id) continue;
    const a = audits.get(id);
    const instructions = row[programHeader.col + 9];
    const hold = a?.safe === "No" || /do not expose|manual review|information only/i.test(a?.note ?? "");
    const current = entries.get(id);
    entries.set(id, {
      ...(current ?? blankEntry("program", id)), id, kind: "program",
      name: row[programHeader.col + 2] || current?.name || id,
      organization: row[programHeader.col + 3],
      description: row[programHeader.col + 4],
      sourceUrl: a?.source || row[programHeader.col + 12],
      secondarySourceUrl: a?.secondary || "",
      verifiedOn: a?.verified || "",
      lastVerifiedAt: a?.verified || "",
      verifiedBy: "PCSN/admin",
      verificationStatus: status(a?.status ?? ""),
      sourceNotes: a?.note ?? "",
      implementationHold: hold,
      eligibilityMode: hold || a?.status === "PARTIALLY VERIFIED" ? "manual_review" : "screening_only",
      providerRequired: /provider/.test(`${instructions} ${a?.note ?? ""}`.toLowerCase()),
      billingEntityRequired: /billing entity|medical bill|account/.test(`${row[programHeader.col + 5]} ${a?.note ?? ""}`.toLowerCase()),
      routeActionType: action(instructions, hold),
      applicationUrl: a?.source || row[programHeader.col + 12],
      applicationId: id,
      submissionInstructions: instructions,
      enabled: false,
    });
  }
  const questionRows = rows(sheet(master, "Master Intake Fields"));
  const questionHeader = headerIndex(questionRows, "Field ID");
  for (const row of questionRows.slice(questionHeader.row + 1)) {
    const id = row[questionHeader.col];
    if (!id || entries.has(id)) continue;
    entries.set(id, { ...blankEntry("question", id), name: row[questionHeader.col + 2], description: row[questionHeader.col + 4], help: row[questionHeader.col + 9], factKey: `catalog_${slug(id).replaceAll("-", "_")}`, conditional: !/^always$/i.test(row[questionHeader.col + 5]), enabled: false });
  }
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
    entries.set(program.id, { ...program, questionIds: [...new Set([...program.questionIds, ...questionIds])] });
  }
  const drugRows = rows(sheet(master, "Oncology Drug PAP"));
  const drugHeader = headerIndex(drugRows, "Brand drug");
  for (const row of drugRows.slice(drugHeader.row + 1)) {
    const name = row[drugHeader.col];
    if (!name) continue;
    const id = `drug-${slug(name)}`;
    if (entries.has(id)) continue;
    entries.set(id, { ...blankEntry("drug", id), name, organization: row[drugHeader.col + 3], sourceUrl: row[drugHeader.col + 5], enabled: false });
  }
  // Only audited manufacturer programs receive automatic product links. Broad
  // manufacturer-name matching is intentionally avoided for legacy routes.
  for (const program of [...entries.values()].filter((entry) => entry.kind === "program" && /^MEDCOST-/.test(entry.id))) {
    const org = program.organization.toLowerCase();
    const drugIds = [...entries.values()].filter((entry) => entry.kind === "drug" && entry.organization.toLowerCase() === org).map((entry) => entry.id);
    entries.set(program.id, { ...program, drugIds: [...new Set([...program.drugIds, ...drugIds])] });
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
  // Route rows enrich the matching Program ID where present; no duplicate route program is created.
  const routeRows = rows(sheet(routeBook, "Assistance Routes"));
  const routeHeader = headerIndex(routeRows, "Route ID");
  for (const row of routeRows.slice(routeHeader.row + 1)) {
    const routeId = row[routeHeader.col];
    const programName = row[routeHeader.col + 2];
    if (!routeId || !programName) continue;
    const match = [...entries.values()].find((entry) => entry.kind === "program" && entry.name === programName);
    if (match) entries.set(match.id, { ...match, sourceNotes: [match.sourceNotes, `Route ID: ${routeId}`].filter(Boolean).join(" ") });
  }
  const parsed = catalogSchema.parse([...entries.values()]);
  return { entries: parsed, counts: parsed.reduce((a, e) => ({ ...a, [e.kind]: (a[e.kind] ?? 0) + 1 }), {} as Record<string, number>), warnings: ["Imported as a disabled draft. Audited verification metadata was preserved. No program was published or enabled."] };
}
