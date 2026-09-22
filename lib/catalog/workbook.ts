import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs/promises";
import JSZip from "jszip";
import { blankEntry, catalogSchema, type Entry } from "./model";
function value(sheet: ExcelJS.Worksheet, row: number, col: number) {
  const cell = sheet.getCell(row, col);
  if (cell.type === ExcelJS.ValueType.Formula)
    throw new Error(
      "Formula cells are not accepted in catalog imports. Paste values first.",
    );
  return cell.text.trim();
}
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 85);
async function normalizeWorkbook(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  let total = 0;
  if (Object.keys(zip.files).length > 500)
    throw new Error("Workbook has too many parts.");
  for (const file of Object.values(zip.files)) {
    const size =
      (file as unknown as { _data?: { uncompressedSize: number } })._data
        ?.uncompressedSize ?? 0;
    total += size;
    if (total > 25_000_000) throw new Error("Expanded workbook exceeds 25 MB.");
    if (!file.dir && /\.(xml|rels)$/.test(file.name)) {
      let xml = await file.async("string");
      // The supplied templates use namespace-prefixed SpreadsheetML, which ExcelJS does not parse.
      if (file.name.endsWith(".rels")) {
        const owner = file.name.replace("_rels/", "").replace(/\.rels$/, "");
        xml = xml.replace(
          /Target="\/([^" ]+)"/g,
          (_, target) =>
            `Target="${path.posix.relative(path.posix.dirname(owner), target)}"`,
        );
        zip.file(file.name, xml);
      }
      const prefix = xml.match(
        /xmlns:([A-Za-z0-9_]+)="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/,
      )?.[1];
      if (prefix) {
        xml = xml
          .replace(new RegExp(`(<\\/?)(?:${prefix}):`, "g"), "$1")
          .replace(new RegExp(`xmlns:${prefix}=`, "g"), "xmlns=");
        zip.file(file.name, xml);
      }
    }
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
export async function importWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await normalizeWorkbook(buffer)) as never);
  const entries: Entry[] = [];
  const warnings: string[] = [];
  const canonical = workbook.getWorksheet("Portal Catalog");
  if (canonical) {
    const keys = Object.keys(
      blankEntry("program", "sample"),
    ) as (keyof Entry)[];
    if (keys.some((k, i) => value(canonical, 1, i + 1) !== k))
      throw new Error(
        "Portal Catalog columns do not match this template version.",
      );
    if (canonical.rowCount > 2001)
      throw new Error("Maximum 2,000 catalog items per import.");
    for (let row = 2; row <= canonical.rowCount; row++) {
      if (!value(canonical, row, 1)) continue;
      const obj: Record<string, unknown> = {};
      const sample = blankEntry("program", "sample");
      keys.forEach((key, i) => {
        const raw = value(canonical, row, i + 1);
        obj[key] = Array.isArray(sample[key])
          ? JSON.parse(raw || "[]")
          : typeof sample[key] === "boolean"
            ? raw === "true"
            : typeof sample[key] === "number"
              ? Number(raw)
              : raw;
      });
      entries.push(obj as Entry);
    }
    warnings.push(
      "Portal Catalog is the round-trip data sheet; original reference tabs are preserved separately. Imported verification is cleared pending staff review.",
    );
  } else {
    const routes = workbook.getWorksheet("Assistance Routes");
    if (routes) {
      if (routes.rowCount > 2004) throw new Error("Too many route rows.");
      for (let r = 5; r <= routes.rowCount; r++) {
        const key = value(routes, r, 1);
        if (!key) continue;
        const e = blankEntry("program", `route-${key}`);
        e.name = value(routes, r, 3);
        e.category = value(routes, r, 2);
        e.description = `${value(routes, r, 2)} · ${value(routes, r, 4)}\nPossible benefit: ${value(routes, r, 8)}`;
        e.reviewNotes = [
          `Screen when: ${value(routes, r, 5)}`,
          `Minimum data: ${value(routes, r, 6)}`,
          `Priority: ${value(routes, r, 11)}`,
        ];
        e.submissionInstructions = value(routes, r, 7);
        const url = value(routes, r, 9);
        e.sourceUrl = url.startsWith("https://") ? url : "";
        e.applicationUrl = e.sourceUrl;
        e.applicationId = e.id;
        e.reviewCadence = value(routes, r, 12);
        e.enabled = false;
        entries.push(e);
      }
      warnings.push(
        "Routes imported disabled. Verify actual application destinations, map reusable questions, define explicit triggers and set PCSN’s role before enabling. Narrative screening text is not executable eligibility logic.",
      );
    }
    const fields =
      workbook.getWorksheet("Master Intake Fields") ??
      workbook.getWorksheet("Ask Once Fields");
    if (fields) {
      for (
        let r = fields.name === "Master Intake Fields" ? 6 : 5;
        r <= Math.min(fields.rowCount, 2005);
        r++
      ) {
        const key = value(fields, r, 1);
        if (!key) continue;
        const e = blankEntry("question", `inventory-${key}`);
        e.name = value(fields, r, 3);
        e.description = `${value(fields, r, 2)}: ${value(fields, r, 4)}; ${value(fields, r, 5)}`;
        e.help = value(
          fields,
          r,
          fields.name === "Master Intake Fields" ? 10 : 6,
        );
        e.enabled = false;
        entries.push(e);
      }
      warnings.push(
        "Question rows need canonical fact mappings and verification before publication.",
      );
    }
    const programs = workbook.getWorksheet("Program Catalog");
    if (programs)
      for (let r = 6; r <= Math.min(programs.rowCount, 2005); r++) {
        const key = value(programs, r, 1);
        if (!key) continue;
        const e = blankEntry("program", `inventory-${key}`);
        e.name = value(programs, r, 3);
        e.organization = value(programs, r, 4);
        e.description = value(programs, r, 5);
        e.reviewNotes = [
          value(programs, r, 6),
          value(programs, r, 7),
          value(programs, r, 8),
          value(programs, r, 12),
          value(programs, r, 14),
        ];
        const url = value(programs, r, 13);
        e.sourceUrl = url.startsWith("https://") ? url : "";
        e.applicationId = e.id;
        e.submissionInstructions = value(programs, r, 10);
        e.enabled = false;
        entries.push(e);
      }
    const facilities = workbook.getWorksheet("AZ Facilities");
    if (facilities)
      for (let r = 6; r <= Math.min(facilities.rowCount, 2005); r++) {
        const name = value(facilities, r, 1);
        if (!name) continue;
        const e = blankEntry("facility", `inventory-facility-${slug(name)}`);
        e.name = name;
        e.location = `${value(facilities, r, 2)}, ${value(facilities, r, 3)}`;
        e.organization = value(facilities, r, 4);
        e.description = value(facilities, r, 9);
        const url = value(facilities, r, 7);
        e.sourceUrl = url.startsWith("https://") ? url : "";
        e.enabled = false;
        entries.push(e);
      }
    const drugs = workbook.getWorksheet("Oncology Drug PAP");
    if (drugs)
      for (let r = 6; r <= Math.min(drugs.rowCount, 2005); r++) {
        const name = value(drugs, r, 1);
        if (!name) continue;
        const org = value(drugs, r, 4);
        const e = blankEntry(
          "drug",
          `inventory-drug-${slug(name + "-" + org)}`,
        );
        e.name = name;
        e.organization = org;
        e.location = value(drugs, r, 2);
        e.description = `${value(drugs, r, 3)}; ${value(drugs, r, 5)}; ${value(drugs, r, 9)}`;
        const url = value(drugs, r, 6);
        e.sourceUrl = url.startsWith("https://") ? url : "";
        e.enabled = false;
        entries.push(e);
      }
    const docs = workbook.getWorksheet("Documents & Consent");
    if (docs)
      for (let r = 6; r <= Math.min(docs.rowCount, 2005); r++) {
        const key = value(docs, r, 1);
        if (!key) continue;
        const e = blankEntry("document", `inventory-${key}`);
        e.name = value(docs, r, 2);
        e.description = value(docs, r, 6);
        e.help = value(docs, r, 5);
        e.enabled = false;
        entries.push(e);
      }
    warnings.push(
      "Imported reference rows are unverified and disabled. Existing equivalent items should be updated rather than publishing duplicate programs. LIHEAP and Power AZ must remain separate cases sharing one application.",
    );
  }
  if (!entries.length)
    throw new Error(
      "No supported catalog sheet found. Use the PCSN templates or an exported Portal Catalog workbook.",
    );
  entries.forEach((e) => {
    e.verifiedOn = "";
    e.verifiedBy = "";
  });
  return { entries: catalogSchema.parse(entries), warnings };
}
export async function exportWorkbook(entries: Entry[]) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    (await normalizeWorkbook(
      await fs.readFile(
        path.join(
          process.cwd(),
          "public/templates/PCSN_Master_Application_Question_Inventory.xlsx",
        ),
      ),
    )) as never,
  );
  const sheet = workbook.addWorksheet("Portal Catalog");
  const keys = Object.keys(blankEntry("program", "sample")) as (keyof Entry)[];
  sheet.addRow(keys);
  for (const entry of entries)
    sheet.addRow(
      keys.map((k) =>
        typeof entry[k] === "object"
          ? JSON.stringify(entry[k])
          : String(entry[k]),
      ),
    );
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: { row: 1, column: keys.length } };
  sheet.columns.forEach((c) => {
    c.width = 25;
  });
  sheet.getRow(1).font = { bold: true };
  const info = workbook.addWorksheet("Export Notes");
  info.addRows([
    ["Portal Catalog is the authoritative round-trip sheet for this export."],
    [
      "Other tabs are the unchanged original reference template, not the current published database.",
    ],
    [
      "Import creates an unsaved draft; it never publishes. Reverify imported records.",
    ],
    ["No patient facts or uploaded documents are exported."],
  ]);
  info.getColumn(1).width = 110;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
