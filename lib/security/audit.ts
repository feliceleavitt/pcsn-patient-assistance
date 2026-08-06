import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/admin";
import { uuidOrNull } from "@/lib/security/actors";

type AuditAction =
  | "view_dashboard"
  | "view_submission"
  | "view_resources"
  | "create_packet"
  | "request_signature"
  | "patient_sign_packet"
  | "update_packet"
  | "download_signed_packet"
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
    actor_id: uuidOrNull(input.actorId),
    actor_identifier: input.actorId,
    action: input.action,
    submission_id: input.submissionId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
