import { NextResponse } from "next/server";
import { buildPatientPacketPdf } from "@/lib/packets/pdf";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getDemoSubmission, isDemoMode } from "@/lib/demo/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId } = await params;
  const submission = isDemoMode()
    ? getDemoSubmission(submissionId)
    : (
        await createServiceClient()
          .from("submissions")
          .select("*,patients(*),documents(*)")
          .eq("id", submissionId)
          .maybeSingle()
      ).data;

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const bytes = await buildPatientPacketPdf({ submission });

  await recordAuditEvent({
    actorId: session.user.id,
    action: "download_packet",
    submissionId,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pcsn-patient-packet.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
