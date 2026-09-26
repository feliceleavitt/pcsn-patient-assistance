const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
const { normalizeBillingEntity } = require("../lib/billing-entities.ts");
const { adaptSubmission } = require("../lib/assistance/profile.ts");
const { blankEntry } = require("../lib/catalog/model.ts");
const { routingPreview } = require("../lib/catalog/routing-preview.ts");
test("conservative biller normalization preserves entered values and never uses a treatment site", () => {
  assert.deepEqual(normalizeBillingEntity("Yuma Regional Medical Center"), { catalogId: "facility-yuma-regional-medical-center-onvida-health", matchState: "matched" });
  assert.deepEqual(normalizeBillingEntity("Unlisted Physician Group"), { matchState: "unmatched" });
  const profile = adaptSubmission({ treatment_facilities: ["Yuma Regional Medical Center"] });
  assert.equal(profile.facts.billingEntity.state, "unknown");
});
test("structured billers support multiple records, optional accounts, ambiguity, and read-only Onvida routing", () => {
  const submission = { billing_entities: [{ name: "Onvida Health", matchState: "matched", documentId: "bill-1" }, { name: "Physician Group", billType: "physician", matchState: "unmatched" }] };
  const profile = adaptSubmission(submission); assert.equal(profile.facts.billingEntity.state, "known"); assert.equal(profile.facts.billingEntity.evidence.length, 2);
  const onvida = { ...blankEntry("program", "MED-ONVIDA"), enabled: true, manualOnly: true, billingEntityRequired: true, name: "Onvida", sourceUrl: "https://example.org" };
  const before = JSON.stringify({ submission, profile }); const result = routingPreview([onvida], profile)[0];
  assert.equal(result.matchState, "MANUAL_REVIEW"); assert.equal(JSON.stringify({ submission, profile }), before);
  const ambiguous = adaptSubmission({ billing_entities: [{ name: "Possible Onvida", matchState: "ambiguous" }] });
  assert.equal(routingPreview([onvida], ambiguous)[0].matchState, "MANUAL_REVIEW");
});
