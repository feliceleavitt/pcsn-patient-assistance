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
