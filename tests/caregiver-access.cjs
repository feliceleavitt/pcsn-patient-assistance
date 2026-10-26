const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");

test("caregiver migration gives browser roles no data access and supports revocation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table public.patients(id uuid primary key); insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'); insert into public.patients values ('00000000-0000-4000-8000-000000000003');`);
    await db.exec(fs.readFileSync("supabase/migrations/025_secure_caregiver_access.sql", "utf8").replace("default gen_random_uuid()", ""));
    await db.query("insert into public.caregiver_access(id,patient_id,caregiver_user_id,granted_by_user_id) values ($1,$2,$3,$4)", ["00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000001"]);
    await db.query("update public.caregiver_access set revoked_at=now() where id=$1", ["00000000-0000-4000-8000-000000000004"]);
    assert.equal((await db.query("select revoked_at is not null as revoked from public.caregiver_access")).rows[0].revoked, true);
    const browserGrants = await db.query("select count(*)::int as count from information_schema.role_table_grants where table_schema='public' and table_name in ('caregiver_access','caregiver_invitations') and grantee in ('anon','authenticated') and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')");
    assert.equal(browserGrants.rows[0].count, 0);
  } finally { await db.close(); }
});
