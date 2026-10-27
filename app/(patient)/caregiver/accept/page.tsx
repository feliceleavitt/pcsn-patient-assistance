import Link from "next/link";
import { redirect } from "next/navigation";
import { recordAuditEvent } from "@/lib/security/audit";
import { hashCaregiverInvitationToken, normalizeCaregiverEmail } from "@/lib/security/caregivers";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

export default async function CaregiverAcceptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const session = await requirePatientSession();
  const { token } = await searchParams;
  if (!token) redirect("/patient");
  const db = createServiceClient();
  const { data: invitation } = await db.from("caregiver_invitations").select("id,patient_id,invited_email,expires_at,accepted_at,revoked_at,created_by_user_id").eq("token_hash", hashCaregiverInvitationToken(token)).maybeSingle<{ id: string; patient_id: string; invited_email: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; created_by_user_id: string }>();
  const allowed = invitation && !invitation.accepted_at && !invitation.revoked_at && new Date(invitation.expires_at) > new Date() && normalizeCaregiverEmail(invitation.invited_email) === normalizeCaregiverEmail(session.user.email);
  if (!allowed || !invitation) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-semibold">Invitation unavailable</h1><p className="mt-3 text-slate-600">This caregiver invitation is invalid, expired, revoked, or belongs to a different account.</p><Link className="mt-5 inline-block text-pine underline" href="/patient">Return to patient portal</Link></main>;
  // Claim the one-time token first.  The conditional update is atomic, so two
  // accounts racing the same link cannot both receive access.
  const acceptedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("caregiver_invitations")
    .update({ accepted_at: acceptedAt, accepted_by_user_id: session.user.id })
    .eq("id", invitation.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", acceptedAt)
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-semibold">Invitation unavailable</h1><p className="mt-3 text-slate-600">This caregiver invitation was already used, expired, or revoked.</p><Link className="mt-5 inline-block text-pine underline" href="/patient">Return to patient portal</Link></main>;

  const { error: accessError } = await db.from("caregiver_access").upsert({ patient_id: invitation.patient_id, caregiver_user_id: session.user.id, granted_by_user_id: invitation.created_by_user_id, granted_at: acceptedAt, revoked_at: null, revoked_by_user_id: null }, { onConflict: "patient_id,caregiver_user_id" });
  if (accessError) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-semibold">Could not activate access</h1><p className="mt-3 text-slate-600">Please ask the patient to create a new invitation.</p></main>;
  await recordAuditEvent({ actorId: session.user.id, action: "caregiver_access_granted", metadata: { invitationId: invitation.id, patientId: invitation.patient_id } });
  redirect("/caregiver");
}
