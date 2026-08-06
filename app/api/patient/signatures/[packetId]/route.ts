import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/security/audit";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

const signSchema = z.object({
  signature: z.string().min(1),
  acknowledgment: z.literal(true),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ packetId: string }> },
) {
  const session = await requirePatientSession();
  const { packetId } = await params;
  const body = signSchema.parse(await request.json());
  const supabase = createServiceClient();

  const { data: packet } = await supabase
    .from("assistance_packets")
    .select("id,submission_id,status,submissions!inner(id,patients!inner(user_id))")
    .eq("id", packetId)
    .maybeSingle<{
      id: string;
      submission_id: string;
      status: string;
      submissions: { id: string; patients: { user_id: string | null } };
    }>();

  if (!packet || packet.submissions.patients.user_id !== session.user.id) {
    return NextResponse.json({ error: "Signature request not found" }, { status: 404 });
  }

  if (!["signature_requested", "signed"].includes(packet.status)) {
    return NextResponse.json(
      { error: "This document is not waiting for signature." },
      { status: 400 },
    );
  }

  const requestHeaders = await headers();
  const { error } = await supabase
    .from("assistance_packets")
    .update({
      status: "signed",
      patient_signature: body.signature.trim(),
      patient_signed_at: new Date().toISOString(),
      patient_signature_ip:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      patient_signature_user_agent: requestHeaders.get("user-agent") ?? null,
    })
    .eq("id", packetId);

  if (error) {
    return NextResponse.json({ error: "Unable to save signature" }, { status: 500 });
  }

  await recordAuditEvent({
    actorId: session.user.id,
    action: "patient_sign_packet",
    submissionId: packet.submission_id,
    metadata: { packetId },
  });

  return NextResponse.json({ ok: true });
}
