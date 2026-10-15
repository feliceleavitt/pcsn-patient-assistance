const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");

const migration = (name) => fs.readFileSync(`supabase/migrations/${name}`, "utf8");
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const key = "00000000-0000-4000-8000-000000000010";
const draft = "00000000-0000-4000-8000-000000000020";

const patient = {
  first_name: "Synthetic", last_name: "Patient", date_of_birth: "1980-01-02",
  phone: "555-0100", email: "synthetic@example.invalid", address_line_1: "1 Test Way",
  address_line_2: null, city: "Phoenix", state: "AZ", postal_code: "85001",
};
const submission = {
  assistance_type: "both", representative: {}, cancer_type: "Test", diagnosis_date: "2025-01-01",
  treatment_plan: "Treatment", treatment_start_date: null, medication_requested: null,
  clinic_name: "Clinic", provider_name: "Provider", provider_npi: "", provider_phone: "555",
  provider_fax: null, provider_address_line_1: "1 Clinic", provider_address_line_2: null,
  provider_city: "Phoenix", provider_state: "AZ", provider_postal_code: "85001",
  hospital_account_number: null, guarantor_number: null, treatment_facilities: [], billing_entities: [],
  has_insurance: false, insurance_details: {}, monthly_income: 1, annual_income: 12,
  household_size: 1, employment_status: "unemployed", household_members: [],
  consent_release: true, consent_contact_permission: true, signature: "Synthetic", signed_at: "2025-01-01T00:00:00.000Z",
};

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create function gen_random_uuid() returns uuid language sql volatile as $$
      select (substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' || substr(md5(random()::text),1,4) || '-4000-8000-' || substr(md5(random()::text),1,12))::uuid
    $$;
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create type public.application_status as enum ('submitted','under_review','missing_documents','approved','denied','renewal_needed');
    create table public.patients (id uuid primary key default gen_random_uuid(), first_name text not null, last_name text not null, date_of_birth date not null, phone text not null, email text not null, address_line_1 text not null, address_line_2 text, city text not null, state text not null, postal_code text not null, user_id uuid references auth.users(id), created_at timestamptz not null default now());
    create table public.submissions (id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id) on delete cascade, assistance_type text not null, representative jsonb not null default '{}'::jsonb, cancer_type text not null, diagnosis_date date not null, treatment_plan text not null, treatment_start_date date, medication_requested text, clinic_name text not null, provider_name text not null, provider_npi text not null, provider_phone text not null, provider_fax text, provider_address_line_1 text not null, provider_address_line_2 text, provider_city text not null, provider_state text not null, provider_postal_code text not null, hospital_account_number text, guarantor_number text, treatment_facilities jsonb not null default '[]'::jsonb, billing_entities jsonb not null default '[]'::jsonb, has_insurance boolean not null, insurance_details jsonb not null default '{}'::jsonb, monthly_income numeric not null, annual_income numeric not null, household_size integer not null, employment_status text not null, household_members jsonb not null default '[]'::jsonb, consent_release boolean not null, consent_contact_permission boolean not null, signature text not null, signed_at timestamptz not null, status public.application_status not null default 'submitted', missing_documents text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
    create table public.documents (id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.submissions(id) on delete cascade, original_filename text not null, document_type text not null, storage_path text not null unique, mime_type text not null, byte_size bigint not null, encryption_iv text not null, encryption_tag text not null, uploaded_at timestamptz not null default now());
  `);
  await db.exec(migration("010_draft_documents.sql"));
  // PGlite does not bundle pgcrypto; the local UUID helper above is test-only.
  await db.exec(migration("015_patient_messages_and_idempotency.sql").replace('create extension if not exists "pgcrypto";\n', ""));
  await db.query("insert into auth.users values ($1),($2)", [owner, other]);
  return db;
}

async function claim(db, idempotencyKey, fingerprint = "a".repeat(64)) {
  return (await db.query("select * from public.pcsn_claim_submission_operation($1,$2,$3)", [owner, idempotencyKey, fingerprint])).rows[0];
}

test("PostgreSQL finalizer atomically persists mapped values, transfers owned drafts, and completes the operation", async () => {
  const db = await setup();
  try {
    await db.query("insert into public.intake_draft_documents(id,user_id,original_filename,document_type,storage_path,mime_type,byte_size,encryption_iv,encryption_tag) values ($1,$2,'synthetic.pdf','photo_id','drafts/synthetic','application/pdf',10,'iv','tag')", [draft, owner]);
    const operation = await claim(db, key);
    const result = await db.query("select * from public.pcsn_finalize_submission_operation($1,$2,$3,$4,$5,$6)", [owner, key, operation.lease_token, { ...patient, id: other, user_id: other, created_at: "2000-01-01T00:00:00Z", unexpected_patient_field: "ignored" }, { ...submission, id: other, patient_id: other, status: "approved", missing_documents: ["injected"], created_at: "2000-01-01T00:00:00Z", updated_at: "2000-01-01T00:00:00Z", unexpected_submission_field: "ignored" }, [draft]]);
    const submissionId = result.rows[0].submission_id;
    assert.equal((await db.query("select user_id,email from public.patients")).rows[0].user_id, owner);
    const saved = (await db.query("select cancer_type,signature,status,missing_documents from public.submissions where id=$1", [submissionId])).rows[0];
    assert.equal(saved.signature, "Synthetic");
    assert.equal(saved.status, "submitted");
    assert.deepEqual(saved.missing_documents, []);
    assert.equal((await db.query("select submission_id,storage_path from public.documents")).rows[0].submission_id, submissionId);
    assert.equal((await db.query("select count(*)::int as n from public.intake_draft_documents")).rows[0].n, 0);
    assert.equal((await db.query("select state,submission_id from public.submission_operations")).rows[0].state, "completed");
    const replay = await claim(db, key);
    assert.equal(replay.outcome, "completed");
    assert.equal(replay.submission_id, submissionId);
    assert.equal((await claim(db, key, "b".repeat(64))).outcome, "conflict");
    await db.query("insert into public.patient_messages(submission_id,patient_user_id,sender_kind,sender_user_id,body) values ($1,$2,'patient',$2,'synthetic message')", [submissionId, owner]);
    await assert.rejects(
      db.query("insert into public.patient_messages(submission_id,patient_user_id,sender_kind,sender_user_id,body) values ($1,$2,'patient',$2,'wrong owner')", [submissionId, other]),
      /does not own submission/,
    );
  } finally { await db.close(); }
});

test("PostgreSQL finalizer rejects stale leases and rolls back records when draft ownership fails", async () => {
  const db = await setup();
  try {
    const stale = await claim(db, key);
    await db.query("update public.submission_operations set lease_expires_at=now()-interval '1 second' where patient_user_id=$1 and idempotency_key=$2", [owner, key]);
    const reclaimed = await claim(db, key);
    await assert.rejects(
      db.query("select * from public.pcsn_finalize_submission_operation($1,$2,$3,$4,$5,$6)", [owner, key, stale.lease_token, patient, submission, []]),
      /lease is no longer valid/,
    );
    await assert.rejects(
      db.query("select * from public.pcsn_finalize_submission_operation($1,$2,$3,$4,$5,$6)", [owner, key, reclaimed.lease_token, patient, submission, [draft]]),
      /Draft documents changed/,
    );
    assert.equal((await db.query("select count(*)::int as n from public.patients")).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int as n from public.submissions")).rows[0].n, 0);
    assert.equal((await db.query("select state from public.submission_operations")).rows[0].state, "processing");
  } finally { await db.close(); }
});
