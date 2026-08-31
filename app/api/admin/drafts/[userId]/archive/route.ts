import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";

async function updateArchive(userId: string, archived: boolean, actorId: string) {
  const { data: draft } = await createServiceClient()
    .from("intake_drafts")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!draft) return false;

  await recordAuditEvent({
    actorId,
    action: archived ? "archive_intake_draft" : "restore_intake_draft",
    metadata: { draftUserId: userId },
  });
  return true;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const session = await requireAdminSession();
  const updated = await updateArchive(userId, true, session.user.id);
  return updated
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Draft not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const session = await requireAdminSession();
  const updated = await updateArchive(userId, false, session.user.id);
  return updated
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Draft not found" }, { status: 404 });
}
