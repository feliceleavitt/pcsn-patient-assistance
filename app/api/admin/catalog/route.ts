import { sameOrigin } from "@/lib/catalog/origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCatalogAdmin } from "@/lib/catalog/access";
import { catalogSchema, stampVerification } from "@/lib/catalog/model";
import { readCatalog, saveCatalog } from "@/lib/catalog/store";
export async function POST(request: Request) {
  const session = await requireCatalogAdmin().catch((e) => {
    if (e instanceof Error && e.message === "CATALOG_FORBIDDEN") return null;
    throw e;
  });
  if (!session)
    return NextResponse.json(
      { error: "Catalog administrator access required" },
      { status: 403 },
    );
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 2_000_000)
      return NextResponse.json(
        { error: "Catalog is too large" },
        { status: 413 },
      );
    const body = z
      .object({
        entries: catalogSchema,
        expected: z.string().nullable(),
        action: z.enum(["draft", "publish"]),
        note: z.string().trim().min(1).max(2000),
        verifiedIds: z.array(z.string()).max(2000).default([]),
      })
      .strict()
      .parse(JSON.parse(raw));
    const current = await readCatalog();
    const previous =
      current.revisions.find((r) => r.id === current.head)?.entries ?? [];
    const actor = session.user.email ?? session.user.id;
    body.entries = stampVerification(
      body.entries,
      previous,
      body.verifiedIds,
      actor,
    );
    return NextResponse.json(
      await saveCatalog(
        body.entries,
        body.expected,
        body.action,
        actor,
        body.note,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Catalog save failed" },
      { status: 409 },
    );
  }
}
