const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const original = Module._load;
let session = {
    role: "admin",
    user: { id: "staff", email: "staff@example.invalid" },
  },
  saved = 0;
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
Module._load = function (request, parent, main) {
  if (request === "@/lib/security/admin")
    return {
      requireAdminSession: async () => {
        if (!session) throw Error("redirect:/admin/login");
        return session;
      },
    };
  if (request === "@/lib/demo/admin") return { isDemoMode: () => false };
  if (request === "@/lib/catalog/store")
    return {
      readCatalog: async () => ({ head: null, revisions: [] }),
      saveCatalog: async () => {
        saved++;
        return {};
      },
    };
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  return original.call(this, request, parent, main);
};
const { POST } = require("../app/api/admin/catalog/route.ts");
const { canManageCatalog } = require("../lib/catalog/access.ts");
test("only configured administrators can manage catalog; volunteer admin alone is insufficient", () => {
  process.env.PCSN_CATALOG_ADMIN_EMAILS = "editor@example.invalid";
  assert.equal(canManageCatalog("admin", "staff@example.invalid"), false);
  assert.equal(canManageCatalog("reviewer", "editor@example.invalid"), false);
  assert.equal(canManageCatalog("admin", "editor@example.invalid"), true);
  assert.equal(canManageCatalog("admin", "demo", true), true);
});
test("catalog writes reject unauthorized staff, cross-origin requests and anonymous sessions before storage", async () => {
  process.env.PCSN_CATALOG_ADMIN_EMAILS = "editor@example.invalid";
  const request = (origin) =>
    new Request("https://portal.example/api/admin/catalog", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        entries: [],
        expected: null,
        action: "draft",
        note: "test",
      }),
    });
  assert.equal((await POST(request("https://portal.example"))).status, 403);
  session.user.email = "editor@example.invalid";
  assert.equal((await POST(request("https://evil.example"))).status, 403);
  session = null;
  await assert.rejects(POST(request("https://portal.example")), /redirect/);
  assert.equal(saved, 0);
});
