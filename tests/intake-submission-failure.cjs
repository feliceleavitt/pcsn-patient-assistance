const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(file) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", output)(module.exports, module);
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const helper = loadModule(path.join(root, "lib/intake/submission-failure.ts"));

test("a failed submission cleans up the just-created patient", async () => {
  let deleted = false;
  const cleanupError = await helper.cleanupNewPatientAfterSubmissionFailure(async () => {
    deleted = true;
    return { error: null };
  });

  assert.equal(deleted, true);
  assert.equal(cleanupError, null);
});

test("intake diagnostics contain only operational error codes", () => {
  const diagnostic = helper.submissionFailureDiagnostic(
    { code: "23502", message: "sensitive payload must not appear" },
    { code: "42501", details: "sensitive cleanup detail must not appear" },
  );

  assert.deepEqual(diagnostic, {
    operation: "submission_insert",
    databaseCode: "23502",
    cleanupSucceeded: false,
    cleanupDatabaseCode: "42501",
  });
  assert.equal(JSON.stringify(diagnostic).includes("sensitive"), false);
});

test("the intake route scopes orphan cleanup to the new patient and signed-in user", () => {
  const route = fs.readFileSync(path.join(root, "app/api/intake/route.ts"), "utf8");
  assert.match(route, /cleanupNewPatientAfterSubmissionFailure\(\(\) =>/);
  assert.match(route, /\.eq\("id", patient\.id\)\s*\.eq\("user_id", patientSession\.user\.id\)/);
  assert.match(route, /submissionFailureDiagnostic\(submissionError, cleanupError\)/);
});
