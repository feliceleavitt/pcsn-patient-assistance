import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/admin";
import { sameOrigin } from "@/lib/catalog/origin";
import { readPublishedCatalog } from "@/lib/catalog/store";
import { createServiceClient } from "@/lib/supabase/server";
import { caseInput, casesEnabled } from "@/lib/assistance/cases";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireAdminSession();
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (!casesEnabled())
    return NextResponse.json(
      { error: "Program case storage is not enabled yet." },
      { status: 503 },
    );
  const parsed = caseInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" "),
      },
      { status: 400 },
    );
  const { submissionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(submissionId))
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const db = createServiceClient();
  const { data: submission, error: readError } = await db
    .from("submissions")
    .select("id")
    .eq("id", submissionId)
    .maybeSingle();
  if (readError)
    return NextResponse.json(
      { error: "Unable to load request." },
      { status: 503 },
    );
  if (!submission)
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const catalog = await readPublishedCatalog();
  const program = catalog.entries.find(
    (e) => e.id === parsed.data.programId && e.kind === "program" && e.enabled,
  );
  if (!program)
    return NextResponse.json(
      { error: "Choose a currently published program." },
      { status: 400 },
    );
  const { programId, revision, ...fields } = parsed.data;
  const record = {
    ...fields,
    updated_by: session.user.email || session.user.id,
  };
  const result =
    revision === 0
      ? await db
          .from("program_cases")
          .insert({
            ...record,
            submission_id: submissionId,
            program_id: programId,
            program_name: program.name,
            catalog_version: catalog.version,
          })
          .select("*")
          .single()
      : await db
          .from("program_cases")
          .update(record)
          .eq("submission_id", submissionId)
          .eq("program_id", programId)
          .eq("revision", revision)
          .select("*")
          .maybeSingle();
  if (result.error || !result.data)
    return NextResponse.json(
      {
        error:
          "The case changed or could not be saved. Reload before retrying.",
      },
      { status: 409 },
    );
  return NextResponse.json({ case: result.data });
}
