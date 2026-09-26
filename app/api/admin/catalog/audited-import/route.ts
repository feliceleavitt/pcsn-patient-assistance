import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog/access";
import { sameOrigin } from "@/lib/catalog/origin";
import { importAuditedCatalogs } from "@/lib/catalog/audited-import";
import { readCatalog, saveCatalog } from "@/lib/catalog/store";

export async function POST(request: Request) {
  const session = await requireCatalogAdmin();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const form = await request.formData();
  const master = form.get("master"), routes = form.get("routes"), audit = form.get("audit");
  if (!(master instanceof File) || !(routes instanceof File) || !(audit instanceof File))
    return NextResponse.json({ error: "Upload the audited master, route, and source-audit workbooks." }, { status: 400 });
  try {
    const current = await readCatalog();
    const base = current.revisions.find((revision) => revision.id === current.head)?.entries ?? [];
    const imported = await importAuditedCatalogs(Buffer.from(await master.arrayBuffer()), Buffer.from(await routes.arrayBuffer()), Buffer.from(await audit.arrayBuffer()), base);
    const next = await saveCatalog(imported.entries, current.head, "draft", session.user.email || session.user.id, "Audited catalog import: source-audited workbooks; draft only.");
    return NextResponse.json({ draftId: next.head, counts: imported.counts, warnings: imported.warnings }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Audited draft import failed." }, { status: 400 });
  }
}
