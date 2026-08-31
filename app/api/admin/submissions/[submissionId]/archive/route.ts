import { NextResponse } from "next/server";
import { setDemoSubmissionArchived, isDemoMode } from "@/lib/demo/admin";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";

async function updateArchive(
  submissionId: string,
  archived: boolean,
  actorId: string,
) {
  if (isDemoMode()) {
    return setDemoSubmissionArchived(submissionId, archived);
  }

  const { data: submission } = await createServiceClient()
    .from("submissions")
    .select("id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) return false;

  await recordAuditEvent({
    actorId,
    action: archived ? "archive_submission" : "restore_submission",
    submissionId,
  });
  return true;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params;
  const session = await requireAdminSession();
  const updated = await updateArchive(submissionId, true, session.user.id);
  return updated
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Submission not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params;
  const session = await requireAdminSession();
  const updated = await updateArchive(submissionId, false, session.user.id);
  return updated
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Submission not found" }, { status: 404 });
}
