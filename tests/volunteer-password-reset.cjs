// Run with: node --test tests/volunteer-password-reset.cjs
// Compile project TypeScript in-memory and isolate external database/email calls.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
let rows, messages, databaseFailure, emailFailure;
const approved = 'volunteer@example.org';
process.env.VOLUNTEER_EMAILS = approved;
process.env.ADMIN_SESSION_SECRET = 'test-secret-for-isolated-tests-only';
process.env.NEXT_PUBLIC_APP_URL = 'https://portal.example.org';
process.env.RESEND_API_KEY = 'test-only';
process.env.NOTIFICATION_FROM_EMAIL = 'portal@example.org';

function query() {
  let action = 'read', record, filters = [];
  const chain = {
    select() { return chain; },
    eq(key, value) { filters.push([key, value]); return chain; },
    update(value) { action = 'update'; record = value; return chain; },
    insert(value) { action = 'insert'; record = value; return chain; },
    async maybeSingle() {
      if (databaseFailure) return { data: null, error: { code: '08006' } };
      const match = [...rows.values()].find(row => filters.every(([key, value]) => row[key] === value));
      if (action === 'read') return { data: match ?? null, error: null };
      if (action === 'insert' && rows.has(record.email)) return { data: null, error: { code: '23505' } };
      if (action === 'update' && !match) return { data: null, error: null };
      rows.set(record.email, record);
      return { data: { email: record.email }, error: null };
    },
  };
  return chain;
}
Module._extensions['.ts'] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  module._compile(compiled.outputText, filename);
};
Module._load = function(request, parent, isMain) {
  if (request === '@/lib/supabase/server') return { createServiceClient: () => ({ from: () => query() }) };
  if (request === '@/lib/notifications/email') return { sendVolunteerPasswordReset: async (...args) => {
    if (emailFailure) throw new Error('provider unavailable');
    messages.push(args); return true;
  } };
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
const tokens = require('../lib/security/volunteer-password-reset.ts');
const volunteers = require('../lib/security/volunteers.ts');
const forgot = require('../app/api/admin/forgot-password/route.ts');
const reset = require('../app/api/admin/reset-password/route.ts');
const request = body => new Request('https://untrusted-host.example/api/admin/reset-password', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
beforeEach(() => { rows = new Map(); messages = []; databaseFailure = false; emailFailure = false; process.env.VOLUNTEER_EMAILS = approved; });

test('recovery tokens expire, reject tampering and cannot act as login sessions', () => {
  const token = tokens.createVolunteerResetToken(approved, 'salt', 300_000);
  assert.equal(tokens.verifyVolunteerResetToken(token, 300_000).email, approved);
  assert.equal(tokens.verifyVolunteerResetToken(token, 2_100_000), null);
  assert.equal(tokens.verifyVolunteerResetToken(token + '.extra'), null);
  assert.equal(tokens.verifyVolunteerResetToken(token.slice(0, -2) + 'xx'), null);
  assert.equal(volunteers.verifyVolunteerSessionToken(token), null);
  assert.equal(tokens.verifyVolunteerResetToken(volunteers.createVolunteerSessionToken(approved)), null);
});
test('removed volunteers cannot redeem outstanding links', () => {
  const token = tokens.createVolunteerResetToken(approved, null);
  process.env.VOLUNTEER_EMAILS = 'someoneelse@example.org';
  assert.equal(tokens.verifyVolunteerResetToken(token), null);
});
test('requests use configured origin, private fragment, and stable deduplication key', async () => {
  rows.set(approved, { email: approved, password_salt: 'salt' });
  assert.equal((await forgot.POST(request({ email: ' VOLUNTEER@example.org ' }))).status, 200);
  assert.equal(messages.length, 1);
  const [email, link, key] = messages[0];
  const url = new URL(link);
  assert.equal(email, approved); assert.equal(url.origin, 'https://portal.example.org');
  assert.equal(url.search, ''); assert.equal(url.pathname, '/admin/reset-password');
  const token = new URLSearchParams(url.hash.slice(1)).get('token');
  assert.equal(tokens.verifyVolunteerResetToken(token).salt, 'salt');
  assert.equal(key, tokens.resetEmailIdempotencyKey(token));
  assert.equal(tokens.createVolunteerResetToken(approved, 'salt', 300_001), tokens.createVolunteerResetToken(approved, 'salt', 599_999));
});
test('unapproved addresses and delivery errors get the same generic response', async () => {
  const unknown = await forgot.POST(request({ email: 'unknown@example.org' }));
  assert.equal(messages.length, 0);
  emailFailure = true;
  const failed = await forgot.POST(request({ email: approved }));
  assert.deepEqual(await unknown.json(), await failed.json());
  assert.equal(failed.status, 200);
});
test('malformed requests and weak passwords are rejected without mutations', async () => {
  assert.equal((await forgot.POST(request({ email: 'bad' }))).status, 400);
  const token = tokens.createVolunteerResetToken(approved, null);
  for (const password of ['short', 'onlylowercase1', 'ONLYUPPERCASE1', 'NoNumbersHere', 'A1a'.repeat(100)]) {
    assert.equal((await reset.POST(request({ token, password }))).status, 400);
  }
  assert.equal(rows.size, 0);
});
test('existing volunteer resets password once; old password and all old links stop working', async () => {
  const previous = volunteers.hashVolunteerPassword('OriginalPassword1');
  rows.set(approved, { email: approved, ...previous });
  const token = tokens.createVolunteerResetToken(approved, previous.password_salt);
  const result = await reset.POST(request({ token, password: 'ReplacementPassword2' }));
  assert.equal(result.status, 200);
  assert.match(result.headers.get('set-cookie'), /Max-Age=0/);
  const stored = rows.get(approved);
  assert.equal(stored.must_change_password, false);
  assert.equal(volunteers.verifyVolunteerPassword('ReplacementPassword2', stored.password_hash, stored.password_salt), true);
  assert.equal(volunteers.verifyVolunteerPassword('OriginalPassword1', stored.password_hash, stored.password_salt), false);
  assert.equal((await reset.POST(request({ token, password: 'AnotherPassword3' }))).status, 400);
});
test('first-time approved volunteers can set a password, with one winner on simultaneous requests', async () => {
  const token = tokens.createVolunteerResetToken(approved, null);
  const results = await Promise.all([reset.POST(request({ token, password: 'FirstPassword123' })), reset.POST(request({ token, password: 'SecondPassword123' }))]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
  assert.equal(rows.size, 1);
});
test('existing credential compare-and-swap has one winner on simultaneous requests', async () => {
  rows.set(approved, { email: approved, password_salt: 'original' });
  const token = tokens.createVolunteerResetToken(approved, 'original');
  const results = await Promise.all([reset.POST(request({ token, password: 'FirstPassword123' })), reset.POST(request({ token, password: 'SecondPassword123' }))]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
});
test('a password change invalidates previously issued recovery links', async () => {
  const token = tokens.createVolunteerResetToken(approved, 'old-salt');
  rows.set(approved, { email: approved, password_salt: 'new-salt' });
  assert.equal((await reset.POST(request({ token, password: 'Replacement123' }))).status, 400);
});
test('database failure fails closed without overwriting a credential', async () => {
  const token = tokens.createVolunteerResetToken(approved, null);
  databaseFailure = true;
  assert.equal((await reset.POST(request({ token, password: 'Replacement123' }))).status, 503);
  assert.equal(rows.size, 0);
});
