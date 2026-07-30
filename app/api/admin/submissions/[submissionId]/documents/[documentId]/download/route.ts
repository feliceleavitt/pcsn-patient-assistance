import { NextResponse } from "next/server";
import { decryptBuffer } from "@/lib/security/crypto";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getDemoSubmission, isDemoMode } from "@/lib/demo/admin";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ submissionId: string; documentId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId, documentId } = await params;
  if (isDemoMode()) {
    const submission = getDemoSubmission(submissionId);
    const document = submission?.documents.find((item) => item.id === documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return new NextResponse(
      `Demo document preview for ${document.original_filename}`,
      {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${document.original_filename}"`,
          "Cache-Control": "no-store",
        },
      },
    );
  }
  const supabase = createServiceClient();
  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data } = await supabase.storage
    .from("encrypted-documents")
    .download(document.storage_path);
  if (!data) {
    return NextResponse.json({ error: "Document unavailable" }, { status: 404 });
  }

  const decrypted = decryptBuffer(
    Buffer.from(await data.arrayBuffer()),
    document.encryption_iv,
    document.encryption_tag,
  );

  await recordAuditEvent({
    actorId: session.user.id,
    action: "download_document",
    submissionId,
    metadata: { documentId },
  });

  return new NextResponse(decrypted, {
    headers: {
      "Content-Type": document.mime_type,
      "Content-Disposition": `attachment; filename="${document.original_filename.replaceAll('"', "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
