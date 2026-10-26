import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/security/audit";
import { createCaregiverInvitationToken, hashCaregiverInvitationToken, normalizeCaregiverEmail } from "@/lib/security/caregivers";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({ email: z.string().email() });

async function ownedPatientId(userId: string) {
  const db = createServiceClient();
  const { data } = await db.from("patients").select("id").eq("user_id", userId).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function GET() {
  const session = await requirePatientSession();
  const patientId = await ownedPatientId(session.user.id);
  if (!patientId) return NextResponse.json({ invitations: [], caregivers: [] });
  const db = createServiceClient();
  const [{ data: invitations }, { data: caregivers }] = await Promise.all([
    db.from("caregiver_invitations").select("id,invited_email,created_at,expires_at,accepted_at,revoked_at").eq("patient_id", patientId).order("created_at", { ascending: false }),
    db.from("caregiver_access").select("id,caregiver_user_id,granted_at,revoked_at").eq("patient_id", patientId).order("granted_at", { ascending: false }),
  ]);
  return NextResponse.json({ invitations: invitations ?? [], caregivers: caregivers ?? [] });
}

export async function POST(request: Request) {
  const session = await requirePatientSession();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid caregiver email address." }, { status: 400 });
  const email = normalizeCaregiverEmail(parsed.data.email);
  if (email === normalizeCaregiverEmail(session.user.email)) return NextResponse.json({ error: "A patient cannot invite their own account as a caregiver." }, { status: 400 });
  const patientId = await ownedPatientId(session.user.id);
  if (!patientId) return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
  const token = createCaregiverInvitationToken();
  const db = createServiceClient();
  const { data: invitation, error } = await db.from("caregiver_invitations").insert({
    patient_id: patientId, invited_email: email, token_hash: hashCaregiverInvitationToken(token),
    created_by_user_id: session.user.id, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id,expires_at").single<{ id: string; expires_at: string }>();
  if (error || !invitation) return NextResponse.json({ error: "Could not create the caregiver invitation." }, { status: 500 });
  await recordAuditEvent({ actorId: session.user.id, action: "caregiver_invited", metadata: { invitationId: invitation.id, patientId } });
  const base = new URL(request.url).origin;
  return NextResponse.json({ ok: true, invitation: { id: invitation.id, expiresAt: invitation.expires_at, invitationUrl: `${base}/caregiver/accept?token=${encodeURIComponent(token)}` } }, { status: 201 });
}
