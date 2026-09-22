// Run ONLY after migration 009 in the chosen environment; never executed by build or startup.
const fs = require("node:fs");
const ts = require("typescript");
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
const { createClient } = require("@supabase/supabase-js");
const { initialCatalog } = require("../lib/catalog/initial.ts");
(async () => {
  if (process.argv[2] !== "--initialize-empty-catalog")
    throw new Error(
      "Pass --initialize-empty-catalog after reviewing the target environment.",
    );
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await db.rpc("pcsn_catalog_read");
  if (error) throw error;
  if (data.head)
    throw new Error(
      "Catalog already initialized; refusing to overwrite history.",
    );
  const seed = await initialCatalog();
  for (const revision of [...seed.revisions].reverse()) {
    const { error } = await db.rpc("pcsn_catalog_commit", {
      p_expected: revision.parent_id,
      p_id: revision.id,
      p_entries: revision.entries,
      p_action: revision.action,
      p_actor: revision.actor,
      p_note: revision.note,
    });
    if (error) throw error;
  }
  console.log(
    "Seeded existing released catalog and disabled workbook drafts. Enable PCSN_CATALOG_ENABLED only after staging verification.",
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
