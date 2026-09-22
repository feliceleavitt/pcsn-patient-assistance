const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
    }).outputText,
    f,
  );
const { seedState } = require("../lib/catalog/seed.ts");
const {
  commitRevision,
  publishedEntries,
  publicationErrors,
  blankEntry,
  nextReviewDate,
  catalogSchema,
} = require("../lib/catalog/model.ts");
const {
  catalogPrograms,
  ruleMatches,
  withCatalogQuestions,
} = require("../lib/catalog/runtime.ts");
const { exampleProfile } = require("../lib/assistance/examples.ts");
const { buildPlan } = require("../lib/assistance/plan.ts");
const {
  importWorkbook,
  exportWorkbook,
} = require("../lib/catalog/workbook.ts");
test("draft updates cannot enter published workflows; publication is an immutable new snapshot", () => {
  const seed = seedState(),
    entries = structuredClone(seed.revisions[0].entries);
  entries.find((e) => e.id === "mayo-az").applicationUrl =
    "https://example.org/new";
  entries.find((e) => e.id === "mayo-az").verifiedOn = "2026-09-17";
  entries.find((e) => e.id === "mayo-az").verifiedBy = "editor";
  const draft = commitRevision(
    seed,
    entries,
    seed.head,
    "draft",
    "editor",
    "update link",
  );
  assert.notEqual(draft.head, draft.published);
  assert.notEqual(
    publishedEntries(draft).find((e) => e.id === "mayo-az").applicationUrl,
    "https://example.org/new",
  );
  const live = commitRevision(
    draft,
    entries,
    draft.head,
    "publish",
    "editor",
    "reviewed",
  );
  assert.equal(
    publishedEntries(live).find((e) => e.id === "mayo-az").applicationUrl,
    "https://example.org/new",
  );
  assert.equal(live.revisions.length, 3);
  assert.equal(seed.revisions.length, 1);
});
test("concurrent edits reject stale head; no last writer wins", () => {
  const s = seedState();
  assert.throws(
    () => commitRevision(s, [], null, "draft", "a", "b"),
    /Another administrator/,
  );
});
test("publishing rejects unresolved references and unverified content", () => {
  const e = blankEntry("program", "new");
  assert.ok(publicationErrors([e]).length >= 3);
  const s = seedState(),
    entries = structuredClone(s.revisions[0].entries);
  entries.find((e) => e.id === "fact-firstName").enabled = false;
  assert.ok(
    publicationErrors(entries).some((e) => e.includes("disabled question")),
  );
});
test("unknown and conflicting facts never satisfy screening rules", () => {
  const p = exampleProfile("legacy");
  const r = {
    fact: "utilityNeed",
    operator: "equals",
    value: "yes",
    purpose: "surface",
    explanation: "need",
  };
  assert.equal(ruleMatches(p, r), null);
  assert.equal(
    catalogPrograms(publishedEntries(seedState()), p, "v1").some(
      (e) => e.id === "liheap",
    ),
    false,
  );
});
test("shared application retains separate programs and forbids divergent links", () => {
  const entries = publishedEntries(seedState());
  const programs = catalogPrograms(entries, exampleProfile("utilities"), "v1");
  assert.equal(
    programs.filter((e) => e.applicationId === "az-des-direct-energy").length,
    2,
  );
  entries.find((e) => e.id === "power-az").applicationUrl =
    "https://different.example";
  assert.ok(
    publicationErrors(entries).some((e) => e.includes("shared application")),
  );
});
test("unknown configured fields become missing questions without breaking legacy submissions", () => {
  const entries = publishedEntries(seedState());
  const q = {
    ...blankEntry("question", "new-question"),
    name: "New question",
    factKey: "newFact",
  };
  entries.push(q);
  entries.find((e) => e.id === "mayo-az").questionIds.push(q.id);
  const p = withCatalogQuestions(exampleProfile("mayo"), entries);
  const plan = buildPlan(p, catalogPrograms(entries, p, "v1"));
  assert.ok(plan[0].missing.some((e) => e.key === "newFact"));
});
test("quarterly reviews use calendar months and handle month ends", () => {
  const e = {
    ...blankEntry("program", "a"),
    verifiedOn: "2026-11-30",
    reviewMonths: 3,
  };
  assert.equal(nextReviewDate(e), "2027-02-28");
  assert.equal(nextReviewDate({ ...e, verifiedOn: "" }), null);
});
test("unsafe links and future verification dates are rejected", () => {
  const e = blankEntry("program", "a");
  assert.equal(
    catalogSchema.safeParse([{ ...e, applicationUrl: "javascript:alert(1)" }])
      .success,
    false,
  );
  assert.equal(
    catalogSchema.safeParse([{ ...e, verifiedOn: "2099-01-01" }]).success,
    false,
  );
});
test("74-route workbook import is unverified, disabled and never invents executable rules", async () => {
  const result = await importWorkbook(
    fs.readFileSync(
      "public/templates/PCSN_Arizona_Financial_Assistance_Route_Catalog.xlsx",
    ),
  );
  assert.equal(result.entries.filter((e) => e.kind === "program").length, 74);
  assert.ok(result.entries.every((e) => !e.enabled && !e.verifiedOn));
  assert.ok(
    result.entries
      .filter((e) => e.kind === "program")
      .every((e) => e.rules.length === 0),
  );
});
test("workbook export/import round-trips catalog data, resetting verification", async () => {
  const entries = seedState().revisions[0].entries;
  const result = await importWorkbook(await exportWorkbook(entries));
  assert.equal(result.entries.length, entries.length);
  assert.deepEqual(
    result.entries.map((e) => ({ ...e, verifiedOn: "", verifiedBy: "" })),
    entries.map((e) => ({ ...e, verifiedOn: "", verifiedBy: "" })),
  );
});
test("verification identity cannot be spoofed and edits invalidate previous verification", () => {
  const { stampVerification } = require("../lib/catalog/model.ts");
  const e = seedState().revisions[0].entries[0];
  const changed = { ...e, name: "Changed", verifiedBy: "Forged person" };
  assert.equal(
    stampVerification([changed], [e], [], "real-editor")[0].verifiedBy,
    "",
  );
  assert.equal(
    stampVerification([changed], [e], [e.id], "real-editor")[0].verifiedBy,
    "real-editor",
  );
  assert.equal(
    stampVerification(
      [{ ...e, verifiedBy: "Forged" }],
      [e],
      [],
      "real-editor",
    )[0].verifiedBy,
    e.verifiedBy,
  );
});
test("master workbook imports supported tabs as disabled draft items", async () => {
  const data = await importWorkbook(
    fs.readFileSync(
      "public/templates/PCSN_Master_Application_Question_Inventory.xlsx",
    ),
  );
  assert.equal(data.entries.filter((e) => e.kind === "facility").length, 116);
  assert.equal(data.entries.filter((e) => e.kind === "drug").length, 152);
  assert.ok(data.entries.every((e) => !e.enabled && !e.verifiedBy));
});
