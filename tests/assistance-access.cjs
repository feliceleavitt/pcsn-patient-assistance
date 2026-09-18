const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
let cookies, demo, session, user, role, queries;
for (const extension of [".ts", ".tsx"])
  Module._extensions[extension] = (module, filename) =>
    module._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
Module._load = function (request, parent, isMain) {
  if (request === "next/headers")
    return {
      cookies: async () => ({
        get: (key) => (cookies[key] ? { value: cookies[key] } : undefined),
      }),
    };
  if (request === "next/navigation")
    return {
      redirect: (path) => {
        throw Error(`redirect:${path}`);
      },
      notFound: () => {
        throw Error("notFound");
      },
    };
  if (request === "@/lib/demo/admin")
    return { isDemoMode: () => demo, demoSessionToken: "demo-admin-session" };
  if (request === "@/lib/security/volunteers")
    return {
      verifyVolunteerSessionToken: (token) =>
        token === "staff" ? session : null,
      isVolunteerEmail: (email) => email === "staff@example.invalid",
    };
  if (request === "@/lib/supabase/server")
    return {
      createServiceClient: () => ({
        auth: { getUser: async () => ({ data: { user }, error: null }) },
        from: () => {
          queries++;
          const q = {
            select: () => q,
            eq: () => q,
            maybeSingle: async () => ({ data: role }),
          };
          return q;
        },
      }),
    };
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
const { requireAdminSession } = require("../lib/security/admin.ts");
const Preview =
  require("../app/(admin)/admin/assistance-plan-preview/page.tsx").default;
const Detail =
  require("../app/(admin)/admin/submissions/[submissionId]/page.tsx").default;
beforeEach(() => {
  cookies = {};
  demo = false;
  session = null;
  user = null;
  role = null;
  queries = 0;
});
test("anonymous and patient-only sessions cannot access volunteer preview", async () => {
  for (const jar of [{}, { pcsn_patient_session: "patient" }]) {
    cookies = jar;
    await assert.rejects(
      Preview({ searchParams: Promise.resolve({}) }),
      /redirect:\/admin\/login/,
    );
    await assert.rejects(
      Detail({ params: Promise.resolve({ submissionId: "synthetic" }) }),
      /redirect:\/admin\/login/,
    );
    assert.equal(queries, 0);
  }
});
test("invalid token, non-volunteer account and missing staff role are denied", async () => {
  cookies = { pcsn_admin_session: "invalid" };
  await assert.rejects(requireAdminSession(), /redirect:\/admin\/login/);
  user = { email: "patient@example.invalid", id: "patient" };
  await assert.rejects(requireAdminSession(), /redirect:\/admin\/login/);
  user = { email: "staff@example.invalid", id: "staff" };
  await assert.rejects(requireAdminSession(), /redirect:\/admin\/login/);
  role = { role: "admin" };
  assert.equal((await requireAdminSession()).user.id, "staff");
});
test("password-change restriction remains enforced", async () => {
  cookies = { pcsn_admin_session: "staff" };
  session = { mustChangePassword: true };
  await assert.rejects(
    Preview({ searchParams: Promise.resolve({}) }),
    /redirect:\/admin\/change-password/,
  );
});
test("synthetic preview requires authenticated demo mode and is hidden otherwise", async () => {
  cookies = { pcsn_admin_session: "staff" };
  session = { user: { id: "staff" }, role: "admin" };
  await assert.rejects(
    Preview({ searchParams: Promise.resolve({}) }),
    /notFound/,
  );
  demo = true;
  cookies = { pcsn_admin_session: "demo-admin-session" };
  assert.ok(
    await Preview({ searchParams: Promise.resolve({ example: "utilities" }) }),
  );
  assert.equal(queries, 0);
});
test("demo token is rejected when demo mode is off", async () => {
  cookies = { pcsn_admin_session: "demo-admin-session" };
  await assert.rejects(requireAdminSession(), /redirect:\/admin\/login/);
});
