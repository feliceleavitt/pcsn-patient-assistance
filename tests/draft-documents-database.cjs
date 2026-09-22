const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');
test('draft uploads are private and transfer atomically only to their owner’s submission', async () => {
 const db = new PGlite();
 const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002', patient='00000000-0000-4000-8000-000000000003', submission='00000000-0000-4000-8000-000000000004', doc='00000000-0000-4000-8000-000000000005', absent='00000000-0000-4000-8000-000000000006';
 try {
  await db.exec('create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table patients(id uuid primary key,user_id uuid); create table submissions(id uuid primary key,patient_id uuid); create table documents(id uuid primary key,submission_id uuid,original_filename text,document_type text,storage_path text,mime_type text,byte_size bigint,encryption_iv text,encryption_tag text,uploaded_at timestamptz);');
  await db.exec(fs.readFileSync('supabase/migrations/010_draft_documents.sql','utf8'));
  await db.query('insert into auth.users values ($1),($2)',[owner,other]);
  await db.query('insert into patients values ($1,$2)',[patient,owner]);
  await db.query('insert into submissions values ($1,$2)',[submission,patient]);
  await db.query("insert into intake_draft_documents(id,user_id,original_filename,document_type,storage_path,mime_type,byte_size,encryption_iv,encryption_tag) values ($1,$2,'synthetic.pdf','photo_id','synthetic/path','application/pdf',10,'iv','tag')",[doc,owner]);
  const attach = (user,ids) => db.query('select pcsn_attach_draft_documents($1,$2,$3)',[user,submission,ids]);
  await assert.rejects(attach(other,[doc]),/ownership mismatch/);
  await assert.rejects(attach(owner,[doc,absent]),/changed/);
  assert.equal((await db.query('select count(*)::int as n from documents')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int as n from intake_draft_documents')).rows[0].n,1);
  for(const role of ['anon','authenticated']) {
   await db.exec(`set role ${role}`);
   await assert.rejects(db.query('select * from intake_draft_documents'),/permission denied/);
   await assert.rejects(attach(owner,[doc]),/permission denied/);
   await db.exec('reset role');
  }
  await attach(owner,[doc]);
  assert.equal((await db.query('select storage_path from documents')).rows[0].storage_path,'synthetic/path');
  assert.equal((await db.query('select count(*)::int as n from intake_draft_documents')).rows[0].n,0);
 } finally { await db.close(); }
});
