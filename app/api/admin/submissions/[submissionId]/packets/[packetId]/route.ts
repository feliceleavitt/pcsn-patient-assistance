import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPatientSignatureRequest } from "@/lib/notifications/email";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { actorColumns } from "@/lib/security/actors";
import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/admin";

const updatePacketSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request_signature") }),
  z.object({
    action: z.literal("mark_faxed"),
    faxNumber: z.string().min(1),
    faxConfirmation: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("mark_submitted"),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("cancel"),
    notes: z.string().optional(),
  }),
]);

function appUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${path}` : path;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ submissionId: string; packetId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId, packetId } = await params;
  const body = updatePacketSchema.parse(await request.json());

  if (isDemoMode()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createServiceClient();
  const { data: packet } = await supabase
    .from("assistance_packets")
    .select("id,program_name,submissions!inner(id,patients!inner(email))")
    .eq("id", packetId)
    .eq("submission_id", submissionId)
    .maybeSingle<{
      id: string;
      program_name: string;
      submissions: { id: string; patients: { email: string } };
    }>();

  if (!packet) {
    return NextResponse.json({ error: "Packet not found" }, { status: 404 });
  }

  let update: Record<string, unknown>;
  if (body.action === "request_signature") {
    update = {
      status: "signature_requested",
      signature_requested_at: new Date().toISOString(),
      ...actorColumns(session.user.id, "signature_requested_by", "signature_requested_by_identifier"),
    };
  } else if (body.action === "mark_faxed") {
    update = {
      status: "faxed",
      fax_number: body.faxNumber,
      fax_confirmation: body.faxConfirmation?.trim() || null,
      faxed_at: new Date().toISOString(),
      notes: body.notes?.trim() || null,
    };
  } else if (body.action === "mark_submitted") {
    update = {
      status: "submitted",
      notes: body.notes?.trim() || null,
    };
  } else {
    update = {
      status: "cancelled",
      notes: body.notes?.trim() || null,
    };
  }

  const { error } = await supabase
    .from("assistance_packets")
    .update(update)
    .eq("id", packetId)
    .eq("submission_id", submissionId);

  if (error) {
    return NextResponse.json({ error: "Unable to update packet" }, { status: 500 });
  }

  await recordAuditEvent({
    actorId: session.user.id,
    action: body.action === "request_signature" ? "request_signature" : "update_packet",
    submissionId,
    metadata: { packetId, packetAction: body.action, programName: packet.program_name },
  });

  if (body.action === "request_signature") {
    await sendPatientSignatureRequest(
      packet.submissions.patients.email,
      appUrl(`/patient/signatures/${packetId}`),
    );
  }

  return NextResponse.json({ ok: true });
}
