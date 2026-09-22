import Link from "next/link";
import { requireCatalogAdmin } from "@/lib/catalog/access";
import { readCatalog } from "@/lib/catalog/store";
import { isDemoMode } from "@/lib/demo/admin";
import { CatalogEditor } from "@/components/catalog/CatalogEditor";
export const dynamic = "force-dynamic";
export default async function CatalogPage() {
  try {
    await requireCatalogAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "CATALOG_FORBIDDEN")
      return (
        <main className="p-8">
          <h1>Catalog administrator access required</h1>
          <p>Your volunteer account can continue using patient workflows.</p>
          <Link href="/admin">Back to dashboard</Link>
        </main>
      );
    throw error;
  }
  let state;
  try {
    state = await readCatalog();
  } catch {
    return (
      <main className="p-8">
        <h1>Catalog setup required</h1>
        <p>
          Install migration 009 and seed the existing catalog before enabling
          publishing. Patient records are unchanged.
        </p>
        <Link href="/admin">Back to dashboard</Link>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-paper p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="mb-4 inline-block text-pine underline">
          Back to submissions
        </Link>
        <CatalogEditor initial={state} demo={isDemoMode()} />
      </div>
    </main>
  );
}
