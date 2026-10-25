import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await requireAdminSession();
  const { submissionId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a message up to 4,000 characters." }, { status: 400 });
  const supabase = createServiceClient();
  const { data: submission } = await supabase.from("submissions").select("patient_id,patients!inner(user_id)").eq("id", submissionId).maybeSingle();
  const patient = submission?.patients as { user_id?: string } | null;
  if (!patient?.user_id) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  // Credential-based staging volunteers have a signed application session, not
  // an auth.users UUID. `sender_user_id` is an optional Auth foreign key, so
  // leave it null for that secure session type rather than attempting to store
  // a synthetic identifier that Postgres must reject.
  const senderUserId = session.user.id.startsWith("volunteer:")
    ? null
    : session.user.id;
  const { data: message, error } = await supabase.from("patient_messages").insert({ submission_id: submissionId, patient_user_id: patient.user_id, sender_kind: "volunteer", sender_user_id: senderUserId, body: parsed.data.body }).select("id,sender_kind,body,created_at").single();
  if (error || !message) return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  await recordAuditEvent({ actorId: session.user.id, action: "volunteer_message_sent", submissionId, metadata: { senderKind: "volunteer" } });
  return NextResponse.json({ message });
}
