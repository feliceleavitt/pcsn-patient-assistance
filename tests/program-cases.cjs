const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"); const ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
const { programCaseSnapshot } = require("../lib/program-cases.ts");
test("volunteer-selected cases snapshot audited routing context without patient facts", () => {
  const route = { programId: "MED-ONVIDA", routeId: "B10", program: "Onvida", actionType: "VIEW_PROGRAM", matchState: "MANUAL_REVIEW", verificationStatus: "VERIFIED", volunteerOnly: true, providerRequired: false, sourceUrl: "https://onvida.example", rationale: ["Confirm the entity that issued the bill before routing."] };
  const snapshot = programCaseSnapshot(route);
  assert.deepEqual(snapshot, { program_id: "MED-ONVIDA", route_id: "B10", route_action_type: "VIEW_PROGRAM", match_state: "MANUAL_REVIEW", verification_status: "VERIFIED", provider_required: false, source_url: "https://onvida.example", match_rationale: route.rationale });
  route.routeId = "changed"; route.rationale.push("new");
  assert.equal(snapshot.route_id, "B10"); assert.deepEqual(snapshot.match_rationale, ["Confirm the entity that issued the bill before routing."]);
});
test("provider-directed and missing metadata are preserved safely", () => {
  const snapshot = programCaseSnapshot({ programId:"MEDCOST-LILLY", routeId:"", actionType:"PROVIDER_SUBMISSION_REQUIRED", matchState:"MANUAL_REVIEW", verificationStatus:"VERIFIED_WITH_CORRECTION", providerRequired:true, sourceUrl:"", rationale:["Provider action or consent remains outstanding."] });
  assert.equal(snapshot.route_id, null); assert.equal(snapshot.provider_required, true); assert.equal(snapshot.source_url, null);
});
