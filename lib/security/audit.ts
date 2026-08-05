import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/admin";

type AuditAction =
  | "view_dashboard"
  | "view_submission"
  | "view_resources"
  | "update_submission"
  | "download_document"
  | "download_packet";

export async function recordAuditEvent(input: {
  actorId: string;
  action: AuditAction;
  submissionId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (isDemoMode()) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    submission_id: input.submissionId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
