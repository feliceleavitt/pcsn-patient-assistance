const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");

const migration = fs.readFileSync("supabase/migrations/024_program_case_lifecycle_and_packet_submission.sql", "utf8");

test("program-case lifecycle migration preserves submitted packet history and keeps browser roles ungranted", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.submissions(id uuid primary key);
      create table public.assistance_packets(id uuid primary key, submission_id uuid not null references public.submissions(id), status text not null, updated_at timestamptz not null default now());
      create table public.program_cases(id uuid primary key, submission_id uuid not null references public.submissions(id), program_id text not null, created_at timestamptz not null default now());
      create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
      insert into public.submissions values ('00000000-0000-4000-8000-000000000001');
      insert into public.assistance_packets(id,submission_id,status,updated_at) values ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','submitted','2026-01-02T03:04:05Z');
    `);
    await db.exec(migration);
    const packet = (await db.query("select submitted_at from public.assistance_packets")).rows[0];
    assert.equal(new Date(packet.submitted_at).toISOString(), "2026-01-02T03:04:05.000Z");
    await db.query("insert into public.program_cases(id,submission_id,program_id,application_status,reminder_status) values ($1,$2,'synthetic-route','preparing','scheduled')", ["00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000001"]);
    await assert.rejects(db.query("update public.program_cases set application_status='draft', decision_at=now()"), /program_cases_decision_date_check/);
    const grants = await db.query("select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='program_cases' and grantee <> 'postgres' order by grantee, privilege_type");
    assert.deepEqual(grants.rows, [{ grantee: "service_role", privilege_type: "UPDATE" }]);
  } finally { await db.close(); }
});
