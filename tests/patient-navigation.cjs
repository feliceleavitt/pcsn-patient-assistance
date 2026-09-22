const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const original = Module._load;
let signedIn = true, submitted = true, failRead = false, inserts = 0, filters = [];
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText, f);
Module._load = function(request, parent, main) {
  if (request === 'next/navigation') return { redirect: p => { throw new Error(`redirect:${p}`); } };
  if (request === 'next/image' || request === 'next/link' || request.startsWith('@/components/')) return new Proxy({}, { get: () => () => null });
  if (request === '@/lib/security/patient') return { getPatientSession: async () => signedIn ? { user: { id: 'synthetic-owner', email: 'synthetic@example.invalid' } } : null };
  if (request === '@/lib/catalog/store') return { readPublishedCatalog: async () => ({ entries: [] }) };
  if (request === '@/lib/supabase/server') return { createServiceClient: () => ({ from: table => {
    const query = {
      select: () => query, limit: () => query,
      eq: (key, value) => { filters.push([table, key, value]); return query; },
      insert: () => { inserts++; return query; },
      single: async () => ({ data: null }),
      maybeSingle: async () => ({ data: table === 'submissions' && submitted ? { id: 'synthetic-submission' } : null, error: failRead ? { message: 'simulated failure' } : null }),
    }; return query;
  } }) };
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return original.call(this, request, parent, main);
};
const page = require('../app/(public)/intake/page.tsx').default;
test('returning patient sees dashboard without creating or deleting drafts; query is owner-scoped', async () => {
  await assert.rejects(page({ searchParams: Promise.resolve({}) }), /redirect:\/patient$/);
  assert.equal(inserts, 0);
  assert.deepEqual(filters, [['submissions', 'patients.user_id', 'synthetic-owner']]);
});
test('only an explicit new request opens intake after submission', async () => {
  await page({ searchParams: Promise.resolve({ new: '1' }) });
  assert.equal(inserts, 1);
});
test('database errors do not silently start a duplicate draft', async () => {
  failRead = true; inserts = 0;
  await assert.rejects(page({ searchParams: Promise.resolve({}) }), /Unable to check/);
  assert.equal(inserts, 0); failRead = false;
});
test('anonymous access redirects before data queries', async () => {
  signedIn = false; filters = [];
  await assert.rejects(page({ searchParams: Promise.resolve({}) }), /redirect:\/patient\/login/);
  assert.deepEqual(filters, []);
});
