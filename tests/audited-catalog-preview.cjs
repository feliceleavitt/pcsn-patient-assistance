const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
const { blankEntry, catalogSchema } = require("../lib/catalog/model.ts");
const { routingPreview } = require("../lib/catalog/routing-preview.ts");
const profile = (facts = {}) => ({ facts: Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, { label: key, state: "known", evidence: [{ source: "test", value }] }])), documents: [] });
const route = (id, extra = {}) => ({ ...blankEntry("program", id), enabled: true, name: id, sourceUrl: "https://example.org", applicationUrl: "https://example.org", applicationId: id, rules: [{ fact: "medications", operator: "contains_item", value: "fotivda", purpose: "surface", explanation: "Medication is FOTIVDA" }], ...extra });

test("legacy revisions parse with safe default audited fields", () => {
  const legacy = blankEntry("program", "legacy");
  delete legacy.routeActionType; delete legacy.verificationStatus; delete legacy.lastVerifiedAt; delete legacy.sourceVersion; delete legacy.implementationHold; delete legacy.eligibilityMode; delete legacy.providerRequired; delete legacy.billingEntityRequired; delete legacy.drugIds; delete legacy.facilityIds; delete legacy.secondarySourceUrl; delete legacy.sourceNotes;
  const parsed = catalogSchema.parse([legacy])[0];
  assert.equal(parsed.routeActionType, "VOLUNTEER_FOLLOW_UP");
  assert.equal(parsed.verificationStatus, "MANUAL_REVIEW_REQUIRED");
});
test("AVEO routes remain separate and provider-directed", () => {
  const entries = ["pap", "copay", "bridge", "quickstart"].map((suffix) => route(`aveo-${suffix}`, { routeActionType: "PROVIDER_SUBMISSION_REQUIRED", providerRequired: true }));
  const preview = routingPreview(entries, profile({ medications: "fotivda" }));
  assert.deepEqual(preview.map((p) => p.programId), ["aveo-pap", "aveo-copay", "aveo-bridge", "aveo-quickstart"]);
  assert.ok(preview.every((p) => p.providerRequired));
});
test("partially verified EMD and Autolus routes are volunteer-only manual review", () => {
  const entries = [route("emd", { verificationStatus: "PARTIALLY_VERIFIED", routeActionType: "VIEW_PROGRAM" }), route("autolus", { verificationStatus: "PARTIALLY_VERIFIED", routeActionType: "CALL_FOR_SCREENING" })];
  for (const item of routingPreview(entries, profile({ medications: "fotivda" }))) {
    assert.equal(item.matchState, "MANUAL_REVIEW"); assert.equal(item.volunteerOnly, true);
  }
});
test("hard exclusions suppress only explicitly hard-rule routes", () => {
  const excluded = route("commercial-copay", { eligibilityMode: "hard_rule", rules: [{ fact: "insurance", operator: "equals", value: "commercial", purpose: "surface", explanation: "Commercial coverage required" }] });
  const screening = route("navigation", { eligibilityMode: "screening_only", rules: [{ fact: "insurance", operator: "equals", value: "commercial", purpose: "surface", explanation: "Insurance helps screen" }] });
  const preview = routingPreview([excluded, screening], profile({ insurance: "medicare" }));
  assert.deepEqual(preview.map((p) => p.programId), ["navigation"]);
  assert.equal(preview[0].matchState, "POSSIBLE");
});
test("Lilly and RYTELO cannot be rendered as generic Apply routes", () => {
  const preview = routingPreview([route("lilly", { routeActionType: "PROVIDER_SUBMISSION_REQUIRED", providerRequired: true }), route("rytelo", { routeActionType: "PROVIDER_SUBMISSION_REQUIRED", providerRequired: true })], profile({ medications: "fotivda" }));
  assert.ok(preview.every((p) => p.actionType === "PROVIDER_SUBMISSION_REQUIRED"));
});
