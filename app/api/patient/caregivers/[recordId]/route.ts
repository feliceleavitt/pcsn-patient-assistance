import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/security/audit";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  const session = await requirePatientSession();
  const { recordId } = await params;
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "invitation" && kind !== "access") return NextResponse.json({ error: "Unknown caregiver record." }, { status: 400 });
  const db = createServiceClient();
  const { data: patient } = await db.from("patients").select("id").eq("user_id", session.user.id).maybeSingle<{ id: string }>();
  if (!patient) return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
  const table = kind === "invitation" ? "caregiver_invitations" : "caregiver_access";
  const update = kind === "invitation" ? { revoked_at: new Date().toISOString(), revoked_by_user_id: session.user.id } : { revoked_at: new Date().toISOString(), revoked_by_user_id: session.user.id };
  const { data, error } = await db.from(table).update(update).eq("id", recordId).eq("patient_id", patient.id).is("revoked_at", null).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Caregiver record was not found or is already revoked." }, { status: error ? 500 : 404 });
  await recordAuditEvent({ actorId: session.user.id, action: kind === "invitation" ? "caregiver_invitation_revoked" : "caregiver_access_revoked", metadata: { patientId: patient.id, recordId } });
  return NextResponse.json({ ok: true });
}
