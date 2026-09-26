const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
const { importAuditedCatalogs } = require("../lib/catalog/audited-import.ts");
const { routingPreview } = require("../lib/catalog/routing-preview.ts");

const auditedDir = process.env.PCSN_AUDITED_CATALOG_DIR || "/Users/feliceleavitt/Documents/ChatGPT/pcsn 2/outputs/pcsn-source-audit";
const file = (name) => fs.readFileSync(path.join(auditedDir, name));
const catalogs = () => importAuditedCatalogs(
  file("PCSN_Master_Application_Question_Inventory_SOURCE_AUDITED.xlsx"),
  file("PCSN_Arizona_Financial_Assistance_Route_Catalog_SOURCE_AUDITED.xlsx"),
  file("PCSN_Catalog_Source_Audit.xlsx"),
);
const profile = (facts = {}) => ({ facts: Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, { label: key, state: "known", evidence: [{ source: "scenario", value }] }])), documents: [] });
const byId = (entries, id) => entries.find((entry) => entry.id === id);
const route = (entries, facts, id) => {
  const before = JSON.stringify({ entries, facts });
  const result = routingPreview(entries, profile(facts));
  assert.equal(JSON.stringify({ entries, facts }), before, "preview is read-only and cannot create cases or modify patient/submission data");
  return result.find((item) => item.programId === id);
};

test("real audited import preserves stable metadata and deduplicates records", async () => {
  const { entries, counts } = await catalogs();
  assert.deepEqual(counts, { program: 34, question: 105, document: 18, drug: 156, facility: 117 });
  assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length, "no duplicate stable IDs");
  const audited = ["MED-ONVIDA", "MEDCOST-LILLY", "MEDCOST-EMD-COVERONE", "MEDCOST-TEVA-CARES", "MEDCOST-AUTOLUS-AUCATZYL", "MEDCOST-AVEO-PAP", "MEDCOST-AVEO-COPAY", "MEDCOST-AVEO-BRIDGE", "MEDCOST-AVEO-QUICKSTART", "MEDCOST-GERON-RYTELO", "NAV-DHO-FIN"];
  for (const id of audited) {
    const entry = byId(entries, id);
    assert.ok(entry, `${id} retained`);
    assert.ok(entry.routeId, `${id} keeps its Route ID`);
    assert.ok(entry.lastVerifiedAt, `${id} keeps audit verification date`);
    assert.ok(entry.sourceUrl, `${id} keeps official source`);
    assert.notEqual(entry.verificationStatus, "MANUAL_REVIEW_REQUIRED", `${id} audit status was not cleared`);
  }
  assert.deepEqual(byId(entries, "MED-ONVIDA").facilityIds, ["facility-yuma-regional-medical-center-onvida-health"]);
  assert.deepEqual(byId(entries, "NAV-DHO-FIN").facilityIds, ["facility-desert-hematology-oncology"]);
  assert.deepEqual(byId(entries, "MEDCOST-LILLY").drugIds.sort(), ["drug-cyramza", "drug-erbitux", "drug-inluriyo", "drug-jaypirca", "drug-retevmo", "drug-verzenio"]);
  assert.deepEqual(byId(entries, "MEDCOST-EMD-COVERONE").drugIds.sort(), ["drug-bavencio", "drug-tepmetko"]);
  assert.deepEqual(byId(entries, "MEDCOST-AVEO-PAP").drugIds, ["drug-fotivda"]);
  const insuranceCategory = byId(entries, "INS-008");
  assert.deepEqual(insuranceCategory.options, ["commercial", "medicare", "medicaid", "government", "uninsured"]);
  assert.equal(insuranceCategory.factKey, "insuranceCategory");
  assert.equal(insuranceCategory.verifiedOn, "2026-09-26");
  assert.equal(byId(entries, "MEDCOST-AVEO-COPAY").questionIds.includes("INS-008"), true);
  for (const id of byId(entries, "MED-ONVIDA").questionIds) {
    assert.equal(byId(entries, id).enabled, true, `${id} is an approved canonical field activated by the audited crosswalk`);
  }
});

test("1 uninsured Onvida hospital-bill patient is held for billing-entity review", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { insurance: "uninsured", facilities: "Yuma Regional Medical Center" }, "MED-ONVIDA");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.equal(item.actionType, "VIEW_PROGRAM");
});
test("2 treating facility is not substituted for a separate physician billing entity", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { insurance: "underinsured", facilities: "Yuma Regional Medical Center" }, "MED-ONVIDA");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.match(item.rationale.join(" "), /entity that issued the bill/i);
});
test("3 incomplete income evidence yields a review route, not a qualification claim", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { billingEntity: "Onvida Health" }, "MED-ONVIDA");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.notEqual(item.matchState, "MATCHED");
});
test("4 Medicare never receives the explicitly commercial AVEO copay route", async () => {
  const { entries } = await catalogs();
  assert.equal(route(entries, { medications: "fotivda", insurance: "yes", insuranceCategory: "medicare" }, "MEDCOST-AVEO-COPAY"), undefined);
});
test("5 commercial FOTIVDA support is possible, never an asserted qualification", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { medications: "fotivda", insurance: "yes", insuranceCategory: "commercial" }, "MEDCOST-AVEO-COPAY");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.equal(item.actionType, "PROVIDER_SUBMISSION_REQUIRED");
});
test("6 government-insured FOTIVDA patient receives only non-copay review routes", async () => {
  const { entries } = await catalogs();
  assert.equal(route(entries, { medications: "fotivda", insurance: "yes", insuranceCategory: "medicaid" }, "MEDCOST-AVEO-COPAY"), undefined);
  const item = route(entries, { medications: "fotivda", insurance: "yes", insuranceCategory: "medicaid" }, "MEDCOST-AVEO-PAP");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.equal(item.volunteerOnly, true);
});
test("AVEO copay requires the insurance-category fact, not generic coverage presence", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { medications: "fotivda", insurance: "yes" }, "MEDCOST-AVEO-COPAY");
  assert.equal(item.matchState, "MANUAL_REVIEW", "generic coverage presence cannot establish commercial/private coverage");
  assert.match(item.rationale.join(" "), /information missing/i);
});
test("7 FOTIVDA maps to four distinct assistance routes", async () => {
  const { entries } = await catalogs();
  const ids = routingPreview(entries, profile({ medications: "fotivda", insurance: "commercial" })).filter((item) => item.programId.startsWith("MEDCOST-AVEO-")).map((item) => item.programId).sort();
  assert.deepEqual(ids, ["MEDCOST-AVEO-BRIDGE", "MEDCOST-AVEO-COPAY", "MEDCOST-AVEO-PAP", "MEDCOST-AVEO-QUICKSTART"]);
});
test("8 Lilly is provider-directed and held for product-specific workflow", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { medications: "inluriyo" }, "MEDCOST-LILLY");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.equal(item.actionType, "PROVIDER_SUBMISSION_REQUIRED"); assert.equal(item.volunteerOnly, true);
});
test("9 AVEO PAP, copay, Bridge, and Quick Start remain separately provider-directed", async () => {
  const { entries } = await catalogs();
  for (const id of ["MEDCOST-AVEO-PAP", "MEDCOST-AVEO-COPAY", "MEDCOST-AVEO-BRIDGE", "MEDCOST-AVEO-QUICKSTART"]) {
    const item = route(entries, { medications: "fotivda", insurance: "commercial" }, id);
    assert.equal(item.actionType, "PROVIDER_SUBMISSION_REQUIRED"); assert.equal(item.providerRequired, true);
  }
});
test("10 RYTELO is provider-directed rather than an ordinary Apply action", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { medications: "rytelo" }, "MEDCOST-GERON-RYTELO");
  assert.equal(item.actionType, "PROVIDER_SUBMISSION_REQUIRED"); assert.notEqual(item.actionType, "APPLY");
});
test("11 EMD Serono remains partially verified and volunteer-only", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { medications: "bavencio" }, "MEDCOST-EMD-COVERONE");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.equal(item.volunteerOnly, true);
});
test("12 Autolus remains partially verified and uses case-manager contact", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { medications: "aucatzyl" }, "MEDCOST-AUTOLUS-AUCATZYL");
  assert.equal(item.matchState, "MANUAL_REVIEW"); assert.equal(item.actionType, "CALL_FOR_SCREENING"); assert.equal(item.volunteerOnly, true);
});
test("13 Desert Hematology is navigation-only", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { facilities: "Desert Hematology Oncology", billingEntity: "Desert Hematology Oncology" }, "NAV-DHO-FIN");
  assert.equal(item.actionType, "CONTACT_FINANCIAL_COUNSELOR"); assert.notEqual(item.actionType, "APPLY");
});
test("14 a known treating site without a biller still holds Onvida", async () => {
  const { entries } = await catalogs();
  const item = route(entries, { facilities: "Yuma Regional Medical Center", insurance: "commercial" }, "MED-ONVIDA");
  assert.equal(item.matchState, "MANUAL_REVIEW");
});
test("15 insufficient information produces no MATCHED result", async () => {
  const { entries } = await catalogs();
  const result = routingPreview(entries, profile({}));
  assert.equal(result.some((item) => item.matchState === "MATCHED"), false);
  assert.ok(result.every((item) => item.matchState === "POSSIBLE" || item.matchState === "MANUAL_REVIEW"));
});
