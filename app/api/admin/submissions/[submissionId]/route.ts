import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode, updateDemoSubmission } from "@/lib/demo/admin";

const updateSchema = z.object({
  status: z.enum([
    "submitted",
    "under_review",
    "missing_documents",
    "approved",
    "denied",
  ]),
  missingDocuments: z.array(z.string()),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId } = await params;
  const body = updateSchema.parse(await request.json());

  if (isDemoMode()) {
    const updated = updateDemoSubmission(submissionId, body);
    if (!updated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("submissions")
    .update({
      status: body.status,
      missing_documents: body.missingDocuments,
    })
    .eq("id", submissionId);

  if (error) {
    return NextResponse.json({ error: "Unable to update submission" }, { status: 500 });
  }

  if (body.note?.trim()) {
    await supabase.from("admin_notes").insert({
      submission_id: submissionId,
      author_id: session.user.id,
      note: body.note.trim(),
    });
  }

  await recordAuditEvent({
    actorId: session.user.id,
    action: "update_submission",
    submissionId,
    metadata: {
      status: body.status,
      missingDocumentsCount: body.missingDocuments.length,
      noteAdded: Boolean(body.note?.trim()),
    },
  });

  return NextResponse.json({ ok: true });
}
