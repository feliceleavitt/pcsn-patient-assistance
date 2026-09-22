import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/admin";
import { initialCatalog } from "./initial";
import { seedState } from "./seed";
import {
  catalogSchema,
  commitRevision,
  publishedEntries,
  type CatalogState,
  type Revision,
  type Entry,
} from "./model";
const demo = globalThis as typeof globalThis & { pcsnCatalog?: CatalogState };
export function catalogEnabled() {
  return isDemoMode() || process.env.PCSN_CATALOG_ENABLED === "true";
}
export async function readCatalog(): Promise<CatalogState> {
  if (isDemoMode()) {
    if (!demo.pcsnCatalog) demo.pcsnCatalog = await initialCatalog();
    return structuredClone(demo.pcsnCatalog);
  }
  const db = createServiceClient();
  // One database statement returns pointers and history from a consistent snapshot.
  const { data, error } = await db.rpc("pcsn_catalog_read");
  if (error)
    throw new Error(
      "Catalog storage is unavailable. Apply migration 009 before enabling catalog management.",
    );
  return data as CatalogState;
}
export async function saveCatalog(
  entries: Entry[],
  expected: string | null,
  action: Revision["action"],
  actor: string,
  note: string,
) {
  if (action === "publish" && !catalogEnabled())
    throw new Error(
      "Catalog publishing is disabled until runtime rollout is enabled.",
    );
  const state = await readCatalog();
  const next = commitRevision(state, entries, expected, action, actor, note);
  if (isDemoMode()) {
    if (demo.pcsnCatalog?.head !== expected)
      throw new Error(
        "Another administrator saved changes. Reload before saving.",
      );
    demo.pcsnCatalog = next;
    return next;
  }
  const revision = next.revisions[0];
  const { error } = await createServiceClient().rpc("pcsn_catalog_commit", {
    p_expected: expected,
    p_id: revision.id,
    p_entries: revision.entries,
    p_action: action,
    p_actor: actor,
    p_note: note,
  });
  if (error)
    throw new Error(
      error.code === "40001"
        ? "Another administrator saved changes. Reload before saving."
        : "Catalog save failed; no changes were published.",
    );
  return readCatalog();
}
export async function readPublishedCatalog() {
  // Explicit rollout gate preserves the existing release until migration/seed are installed.
  // Once enabled, storage failure never falls back to obsolete or draft program rules.
  if (!catalogEnabled())
    return {
      entries: publishedEntries(seedState()),
      version: "legacy-release",
    };
  if (isDemoMode()) {
    const state = await readCatalog();
    return {
      entries: publishedEntries(state),
      version: state.published ?? "none",
    };
  }
  const { data, error } = await createServiceClient().rpc(
    "pcsn_catalog_published",
  );
  if (error || !data)
    throw new Error("Published assistance catalog is temporarily unavailable.");
  return {
    entries: catalogSchema.parse(data.entries).filter((e) => e.enabled),
    version: String(data.version),
  };
}
