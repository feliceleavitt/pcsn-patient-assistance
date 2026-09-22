const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f);
const { missingIntakeRequirements } = require('../lib/intake/requirements.ts');
const { householdAgeLabel } = require('../lib/household.ts');
const blank = () => ({ patient: {}, provider: {}, diagnosis: {}, hospital: {}, household: {}, consent: {} });
test('blank intake reports every required section and consent, without requiring SSN', () => {
  const missing = missingIntakeRequirements(blank(), true, false);
  for (const step of [0, 1, 3, 4, 6, 8]) assert.ok(missing.some(([s]) => s === step));
  assert.ok(missing.some(([, , message]) => message.includes('first name')));
  assert.ok(missing.some(([, , message]) => message.includes('signature')));
  assert.ok(!missing.some(([, , message]) => /Social Security/.test(message)));
});
test('medication and Mayo requirements are conditional', () => {
  const base = missingIntakeRequirements(blank(), false, false);
  const conditional = missingIntakeRequirements(blank(), true, true);
  assert.ok(!base.some(([, , m]) => /Mayo|medication is required/.test(m)));
  assert.ok(conditional.some(([, , m]) => /Mayo/.test(m)));
  assert.ok(conditional.some(([, , m]) => /medication is required/.test(m)));
});
test('known adult age is never displayed as Minor because of an old unchecked box', () => {
  assert.match(householdAgeLabel({ age: 65, isAdult: false }), /Adult/);
  assert.doesNotMatch(householdAgeLabel({ age: 65, isAdult: false }), /Minor/);
  assert.match(householdAgeLabel({ age: 0, isAdult: false }), /not confirmed/);
  assert.match(householdAgeLabel({ age: 12, isAdult: true }), /differ; confirm/);
  assert.equal(householdAgeLabel({ age: 12, isAdult: false }), 'Age 12 · Minor');
});
