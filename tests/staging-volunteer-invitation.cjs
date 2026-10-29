const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
Module._extensions[".ts"] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  module._compile(compiled.outputText, filename);
};
Module._load = function (request, parent, isMain) {
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};

const invitation = require("../lib/security/staging-volunteer-invitation.ts");
const route = fs.readFileSync(path.join(root, "app/api/admin/staging-volunteer-invitation/route.ts"), "utf8");

test("staging invitation capability is opaque, hashed, and pinned to the stable staging hostname", () => {
  const previousEnvironment = process.env.VERCEL_ENV;
  const previousRecipient = process.env.STAGING_TEST_EMAIL_RECIPIENT;
  try {
    process.env.VERCEL_ENV = "preview";
    process.env.STAGING_TEST_EMAIL_RECIPIENT = "sam.martin@pcsnetwork.org";
    assert.equal(invitation.configuredStagingVolunteerRecipient(), "sam.martin@pcsnetwork.org");
    const first = invitation.createStagingVolunteerSetupCapability();
    const second = invitation.createStagingVolunteerSetupCapability();
    assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(first.token, first.tokenHash);
    assert.notEqual(first.token, second.token);
    assert.match(first.setupUrl, /^https:\/\/pcsn-patient-assistance-git-codex-audited-catalog-preview-pcsn\.vercel\.app\/admin\/setup-password#token=/);
  } finally {
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnvironment;
    if (previousRecipient === undefined) delete process.env.STAGING_TEST_EMAIL_RECIPIENT;
    else process.env.STAGING_TEST_EMAIL_RECIPIENT = previousRecipient;
  }
});

test("invitation endpoint keeps setup capabilities server-side and applies authorization, origin, cooldown, audit controls, and established volunteer sessions", () => {
  for (const requirement of ["sameOrigin(request)", "requireAdminSession()", "session.role !== \"admin\"", "stagingVolunteerInviteCooldownMinutes", "recordAuditEvent", "sendStagingVolunteerSetup", "token_hash", "capability.tokenHash", "listUsers({ page, perPage })", "page <= 20", "session.user.id !== `volunteer:${actorEmail}`", "const actorId = actor?.id ?? session.user.id"]) {
    assert.match(route, new RegExp(requirement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(route, /NextResponse\.json\(\{ ok: true \}/);
  assert.doesNotMatch(route, /NextResponse\.json\([^\n]*setupUrl/);
  assert.doesNotMatch(route, /NextResponse\.json\([^\n]*token/);
});
