import { getDemoArchivedSubmissionIds, isDemoMode } from "@/lib/demo/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function getArchivedSubmissionIds() {
  if (isDemoMode()) return getDemoArchivedSubmissionIds();

  const { data } = await createServiceClient()
    .from("audit_logs")
    .select("submission_id,action,created_at")
    .in("action", ["archive_submission", "restore_submission"])
    .not("submission_id", "is", null)
    .order("created_at", { ascending: true });

  const archivedIds = new Set<string>();
  data?.forEach((event) => {
    if (!event.submission_id) return;
    if (event.action === "archive_submission") archivedIds.add(event.submission_id);
    if (event.action === "restore_submission") archivedIds.delete(event.submission_id);
  });
  return archivedIds;
}

export async function getArchivedDraftUserIds() {
  if (isDemoMode()) return new Set<string>();

  const { data } = await createServiceClient()
    .from("audit_logs")
    .select("action,metadata,created_at")
    .in("action", ["archive_intake_draft", "restore_intake_draft"])
    .order("created_at", { ascending: true });

  const archivedIds = new Set<string>();
  data?.forEach((event) => {
    const metadata = event.metadata as { draftUserId?: unknown } | null;
    const userId = metadata?.draftUserId;
    if (typeof userId !== "string") return;
    if (event.action === "archive_intake_draft") archivedIds.add(userId);
    if (event.action === "restore_intake_draft") archivedIds.delete(userId);
  });
  return archivedIds;
}
