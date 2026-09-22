import { sameOrigin } from "@/lib/catalog/origin";
import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog/access";
import { readCatalog } from "@/lib/catalog/store";
import { exportWorkbook, importWorkbook } from "@/lib/catalog/workbook";
export const runtime = "nodejs";
async function authorized() {
  return requireCatalogAdmin().catch((e) => {
    if (e instanceof Error && e.message === "CATALOG_FORBIDDEN") return null;
    throw e;
  });
}
export async function GET() {
  if (!(await authorized()))
    return NextResponse.json(
      { error: "Catalog administrator access required" },
      { status: 403 },
    );
  const state = await readCatalog();
  const entries =
    state.revisions.find((r) => r.id === state.head)?.entries ?? [];
  const bytes = await exportWorkbook(entries);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=PCSN_Catalog_Export.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
export async function POST(request: Request) {
  if (!(await authorized()))
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
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 2_000_000 ||
      !file.name.endsWith(".xlsx")
    )
      return NextResponse.json(
        { error: "Choose an .xlsx workbook under 2 MB." },
        { status: 400 },
      );
    return NextResponse.json(
      await importWorkbook(Buffer.from(await file.arrayBuffer())),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Workbook import failed",
      },
      { status: 400 },
    );
  }
}
