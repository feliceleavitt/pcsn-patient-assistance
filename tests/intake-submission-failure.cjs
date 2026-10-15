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

test("final submission uploads use the same server-side file restrictions as draft uploads", () => {
  const source = fs.readFileSync(path.join(root, "app/api/intake/route.ts"), "utf8");
  assert.match(source, /patientDocumentTypes\.includes\(documentType\)/);
  assert.match(source, /file\.size > 4_194_304/);
  assert.match(source, /const mimeType = documentMime\(bytes\)/);
  assert.match(source, /documentError/);
  assert.match(source, /remove\(\[storagePath\]\)/);
});

test("the PostgREST cache is explicitly refreshed after routing-schema migrations", () => {
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/013_reload_postgrest_schema.sql"),
    "utf8",
  );
  assert.match(migration, /notify\s+pgrst\s*,\s*'reload schema'/i);
});

test("only the server service role receives intake-table write privileges", () => {
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/014_grant_intake_service_access.sql"),
    "utf8",
  );
  assert.match(migration, /grant select, insert, update, delete on table/i);
  assert.match(migration, /public\.patients,[\s\S]*public\.submissions,[\s\S]*public\.documents/i);
  assert.match(migration, /to service_role/i);
  const grantStatements = migration
    .split(";")
    .filter((statement) => /^\s*grant\b/im.test(statement))
    .join(";");
  assert.doesNotMatch(grantStatements, /to\s+(anon|authenticated)/i);
});

test("submission retries use a patient-scoped idempotency key", () => {
  const route = fs.readFileSync(path.join(root, "app/api/intake/route.ts"), "utf8");
  assert.match(route, /idempotency-key/i);
  assert.match(route, /pcsn_claim_submission_operation/);
  assert.match(route, /requestFingerprint/);
  assert.match(route, /pcsn_complete_submission_operation/);
});

test("patient messages use their dedicated table, never the volunteer-note author UUID", () => {
  const route = fs.readFileSync(path.join(root, "app/api/patient/application/route.ts"), "utf8");
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/015_patient_messages_and_idempotency.sql"), "utf8");
  assert.match(route, /from\("patient_messages"\)/);
  assert.doesNotMatch(route, /author_id:\s*`patient:/);
  assert.match(migration, /revoke all on public\.patient_messages from public, anon, authenticated/i);
  assert.match(migration, /pcsn_assert_message_submission_owner/);
});

test("idempotency SQL uses a lease token so an expired worker cannot complete a reclaimed operation", () => {
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/015_patient_messages_and_idempotency.sql"), "utf8");
  assert.match(migration, /for update/);
  assert.match(migration, /lease_token=p_token/);
  assert.match(migration, /lease_expires_at>now\(\)/);
  assert.match(migration, /submission_id uuid unique/);
  assert.match(migration, /pcsn_finalize_submission_operation/);
  assert.match(migration, /for update/);
});
