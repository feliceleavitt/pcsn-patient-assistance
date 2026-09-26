import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { readPublishedCatalog } from "@/lib/catalog/store";
import { adaptSubmission } from "@/lib/assistance/profile";
import { routingPreview } from "@/lib/catalog/routing-preview";
import { programCaseSnapshot } from "@/lib/program-cases";
import { recordAuditEvent } from "@/lib/security/audit";

export async function POST(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await requireAdminSession();
  const { submissionId } = await params;
  const parsed = z.object({ programId: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a route to create a case." }, { status: 400 });
  const supabase = createServiceClient();
  const { data: submission } = await supabase.from("submissions").select("*,documents(*)").eq("id", submissionId).maybeSingle();
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  const catalog = await readPublishedCatalog();
  const route = routingPreview(catalog.entries, adaptSubmission(submission)).find((item) => item.programId === parsed.data.programId);
  if (!route) return NextResponse.json({ error: "That route is not currently available for volunteer review." }, { status: 409 });
  const { error } = await supabase.from("program_cases").insert({ submission_id: submissionId, ...programCaseSnapshot(route) });
  if (error) return NextResponse.json({ error: /duplicate|unique/i.test(error.message) ? "A case already exists for this program." : "Unable to create program case." }, { status: /duplicate|unique/i.test(error.message) ? 409 : 500 });
  await recordAuditEvent({ actorId: session.user.id, action: "create_program_case", submissionId, metadata: { programId: route.programId, routeId: route.routeId, matchState: route.matchState } });
  return NextResponse.json({ ok: true, snapshot: programCaseSnapshot(route) }, { status: 201 });
}
