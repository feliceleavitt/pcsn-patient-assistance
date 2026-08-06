import { NextResponse } from "next/server";
import { buildPatientPacketPdf } from "@/lib/packets/pdf";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string; packetId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId, packetId } = await params;

  if (isDemoMode()) {
    return NextResponse.json({ error: "Signed packets are disabled in demo mode" }, { status: 404 });
  }

  const supabase = createServiceClient();
  const { data: packet } = await supabase
    .from("assistance_packets")
    .select("*")
    .eq("id", packetId)
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (!packet) {
    return NextResponse.json({ error: "Packet not found" }, { status: 404 });
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("*,patients(*),documents(*)")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const bytes = await buildPatientPacketPdf({ submission, packet });

  await recordAuditEvent({
    actorId: session.user.id,
    action: "download_signed_packet",
    submissionId,
    metadata: { packetId, programName: packet.program_name },
  });

  const safeName = packet.program_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"pcsn-${safeName || "assistance"}-packet.pdf\"`,
      "Cache-Control": "no-store",
    },
  });
}
