import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  assignToMe: z.boolean().optional(),
  applicationDeadline: z.string().date().nullable().optional(),
  submittedAt: z.string().datetime().nullable().optional(),
  followUpAt: z.string().date().nullable().optional(),
  reminderStatus: z.enum(["not_set", "scheduled", "completed", "dismissed"]).optional(),
  applicationStatus: z.enum(["draft", "preparing", "submitted", "pending_decision", "approved", "denied", "closed"]).optional(),
  decisionDetails: z.string().trim().max(5000).nullable().optional(),
  decisionAt: z.string().datetime().nullable().optional(),
  internalNotes: z.string().trim().max(10000).optional(),
}).superRefine((value, ctx) => {
  if (value.decisionAt && value.applicationStatus && !["approved", "denied"].includes(value.applicationStatus)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A decision date requires an approved or denied decision." });
  }
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ submissionId: string; caseId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId, caseId } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the case fields and try again." }, { status: 400 });

  const body = parsed.data;
  const update: Record<string, unknown> = {};
  if (body.assignToMe) update.assigned_to = session.user.email;
  if (body.applicationDeadline !== undefined) update.application_deadline = body.applicationDeadline;
  if (body.submittedAt !== undefined) update.submitted_at = body.submittedAt;
  if (body.followUpAt !== undefined) update.follow_up_at = body.followUpAt;
  if (body.reminderStatus !== undefined) update.reminder_status = body.reminderStatus;
  if (body.applicationStatus !== undefined) update.application_status = body.applicationStatus;
  if (body.decisionDetails !== undefined) update.decision_details = body.decisionDetails || null;
  if (body.decisionAt !== undefined) update.decision_at = body.decisionAt;
  if (body.internalNotes !== undefined) update.internal_notes = body.internalNotes;
  if (!Object.keys(update).length) return NextResponse.json({ error: "No case changes provided." }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("program_cases")
    .update(update)
    .eq("id", caseId)
    .eq("submission_id", submissionId)
    .select("id,assigned_to,application_deadline,submitted_at,follow_up_at,reminder_status,application_status,decision_details,decision_at,internal_notes")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Program case not found or could not be updated." }, { status: error ? 500 : 404 });

  await recordAuditEvent({
    actorId: session.user.id,
    action: body.assignToMe ? "assign_program_case" : "update_program_case",
    submissionId,
    metadata: { caseId, changedFields: Object.keys(update) },
  });
  return NextResponse.json({ ok: true, programCase: data });
}
