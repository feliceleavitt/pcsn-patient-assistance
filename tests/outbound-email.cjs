const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  module._compile(compiled.outputText, filename);
};
const email = require('../lib/notifications/email.ts');

test('all email workflows skip network calls when disabled and retain normal behavior otherwise', async () => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;
  const names = ['VERCEL_ENV', 'DISABLE_OUTBOUND_EMAIL', 'RESEND_API_KEY', 'NOTIFICATION_FROM_EMAIL', 'NOTIFICATION_RECIPIENTS', 'STAGING_TEST_EMAIL_RECIPIENT'];
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const calls = [];
  global.fetch = async (...args) => { calls.push(args); return { ok: true }; };
  console.warn = () => {};
  process.env.RESEND_API_KEY = 'synthetic-test-key';
  process.env.NOTIFICATION_FROM_EMAIL = 'sender@example.invalid';
  process.env.NOTIFICATION_RECIPIENTS = 'volunteer@example.invalid';
  const workflows = [
    () => email.sendPatientPasswordReset('patient@example.invalid', 'https://example.invalid/reset'),
    () => email.sendNewSubmissionNotification(),
    () => email.sendPatientSubmissionConfirmation('patient@example.invalid'),
    () => email.sendPatientSignatureRequest('patient@example.invalid', 'https://example.invalid/sign'),
    () => email.sendVolunteerPasswordReset('volunteer@example.invalid', 'https://example.invalid/reset', 'synthetic-key'),
    () => email.sendStagingVolunteerSetup('volunteer@example.invalid', 'https://example.invalid/setup#token=synthetic', 'synthetic-key'),
  ];
  try {
    delete process.env.VERCEL_ENV;
    process.env.DISABLE_OUTBOUND_EMAIL = 'true';
    for (const run of workflows) await run();
    assert.equal(calls.length, 0);
    delete process.env.DISABLE_OUTBOUND_EMAIL;
    process.env.VERCEL_ENV = 'preview';
    for (const run of workflows) await run();
    assert.equal(calls.length, 1);
    process.env.STAGING_TEST_EMAIL_RECIPIENT = 'volunteer@example.invalid';
    await workflows[4]();
    assert.equal((await workflows[5]()).accepted, true);
    assert.equal(calls.length, 3);
    delete process.env.VERCEL_ENV;
    for (const run of workflows) await run();
    assert.equal(calls.length, workflows.length + 2);
    for (const [url, options] of calls) {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.method, 'POST');
    }
    assert.equal(calls.filter(([, options]) => options.headers['Idempotency-Key'] === 'synthetic-key').length, 4);
  } finally {
    global.fetch = originalFetch;
    console.warn = originalWarn;
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
