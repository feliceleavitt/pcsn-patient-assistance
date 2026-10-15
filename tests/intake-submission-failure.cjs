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

test("relational finalization is delegated to the transactional RPC, not manual cleanup", () => {
  const route = fs.readFileSync(path.join(root, "app/api/intake/route.ts"), "utf8");
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/015_patient_messages_and_idempotency.sql"), "utf8");
  assert.match(route, /pcsn_finalize_submission_operation/);
  assert.doesNotMatch(route, /from\("patients"\)\s*\.insert/);
  assert.doesNotMatch(route, /from\("submissions"\)\s*\.insert/);
  assert.match(migration, /insert into public\.patients/);
  assert.match(migration, /insert into public\.submissions/);
  assert.match(migration, /if not found then raise exception 'Submission operation completion failed'/);
  assert.match(migration, /Any exception aborts this function's transaction/);
});

test("final intake rejects direct uploads rather than silently discarding selected files", () => {
  const source = fs.readFileSync(path.join(root, "app/api/intake/route.ts"), "utf8");
  assert.match(source, /directUploadEntries/);
  assert.match(source, /Save documents before submitting/);
  assert.doesNotMatch(source, /storage\.from\("encrypted-documents"\)/);
  assert.doesNotMatch(source, /from\("documents"\)\.insert/);
});

test("the intake form submits saved draft references, never raw document files", () => {
  const form = fs.readFileSync(path.join(root, "components/intake/IntakeForm.tsx"), "utf8");
  assert.match(form, /body\.append\("draftDocumentIds"/);
  assert.doesNotMatch(form, /body\.append\(`document:\$\{documentType\}`/);
  assert.match(form, /Please wait for saved documents to finish loading or uploading/);
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
  assert.match(route, /pcsn_finalize_submission_operation/);
  assert.doesNotMatch(route, /pcsn_complete_submission_operation/);
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/015_patient_messages_and_idempotency.sql"), "utf8");
  assert.match(migration, /update public\.submission_operations/);
  assert.match(migration, /state='completed',lease_token=null,lease_expires_at=null,submission_id=s\.id/);
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
  assert.match(migration, /pcsn_attach_draft_documents\(p_user,s\.id,p_draft_ids\)/);
  assert.match(migration, /count\(distinct id\)/);
  assert.match(migration, /lease_token=p_token/);
  assert.match(migration, /lease_expires_at>now\(\)/);
  assert.match(migration, /submission_id uuid unique/);
  assert.match(migration, /pcsn_finalize_submission_operation/);
  assert.match(migration, /for update/);
});
