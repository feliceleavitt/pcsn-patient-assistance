import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPatientSignatureRequest } from "@/lib/notifications/email";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { actorColumns } from "@/lib/security/actors";
import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/admin";

const createPacketSchema = z.object({
  programName: z.string().min(1),
  programType: z.enum(["hospital", "manufacturer", "foundation", "other"]),
  programUrl: z.string().url().optional().or(z.literal("")),
  programPhone: z.string().optional(),
  requestSignature: z.boolean().default(false),
  notes: z.string().optional(),
});

function appUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${path}` : path;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId } = await params;
  const body = createPacketSchema.parse(await request.json());

  if (isDemoMode()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createServiceClient();
  const { data: submission } = await supabase
    .from("submissions")
    .select("id,patients(email)")
    .eq("id", submissionId)
    .maybeSingle<{
      id: string;
      patients: { email: string };
    }>();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const signatureRequestedAt = body.requestSignature ? new Date().toISOString() : null;
  const { data: packet, error } = await supabase
    .from("assistance_packets")
    .insert({
      submission_id: submissionId,
      program_name: body.programName,
      program_type: body.programType,
      program_url: body.programUrl || null,
      program_phone: body.programPhone || null,
      status: body.requestSignature ? "signature_requested" : "draft",
      notes: body.notes?.trim() || null,
      signature_requested_at: signatureRequestedAt,
      ...(body.requestSignature
        ? actorColumns(session.user.id, "signature_requested_by", "signature_requested_by_identifier")
        : {}),
      ...actorColumns(session.user.id, "created_by", "created_by_identifier"),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !packet) {
    return NextResponse.json({ error: "Unable to create packet" }, { status: 500 });
  }

  await recordAuditEvent({
    actorId: session.user.id,
    action: body.requestSignature ? "request_signature" : "create_packet",
    submissionId,
    metadata: {
      packetId: packet.id,
      programName: body.programName,
      requestSignature: body.requestSignature,
    },
  });

  if (body.requestSignature) {
    await sendPatientSignatureRequest(
      submission.patients.email,
      appUrl(`/patient/signatures/${packet.id}`),
    );
  }

  return NextResponse.json({ ok: true, packetId: packet.id });
}
