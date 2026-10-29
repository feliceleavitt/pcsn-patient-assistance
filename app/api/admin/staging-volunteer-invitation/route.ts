import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/catalog/origin";
import { sendStagingVolunteerSetup } from "@/lib/notifications/email";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import {
  configuredStagingVolunteerRecipient,
  createStagingVolunteerSetupCapability,
  stagingVolunteerInviteCooldownMinutes,
  stagingVolunteerSetupLifetimeMinutes,
} from "@/lib/security/staging-volunteer-invitation";
import { isVolunteerEmail } from "@/lib/security/volunteers";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const responseHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: responseHeaders });
  }

  const recipient = configuredStagingVolunteerRecipient();
  if (!recipient || !isVolunteerEmail(recipient)) {
    return NextResponse.json({ error: "Staging invitation delivery is not configured." }, { status: 503, headers: responseHeaders });
  }

  const session = await requireAdminSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Volunteer administrator access is required." }, { status: 403, headers: responseHeaders });
  }

  const service = createServiceClient();
  const { data: users, error: usersError } = await service.auth.admin.listUsers({ perPage: 100 });
  const user = users?.users.find((candidate) => candidate.email?.toLowerCase() === recipient);
  const actor = users?.users.find((candidate) => candidate.email?.toLowerCase() === session.user.email?.toLowerCase());
  if (usersError || !user || !actor) {
    return NextResponse.json({ error: "The approved staging volunteer account is unavailable." }, { status: 409, headers: responseHeaders });
  }
  const { data: role, error: roleError } = await service
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !role) {
    return NextResponse.json({ error: "The approved staging volunteer account is unavailable." }, { status: 409, headers: responseHeaders });
  }
  const { data: actorRole, error: actorRoleError } = await service
    .from("admin_roles")
    .select("role")
    .eq("user_id", actor.id)
    .eq("role", "admin")
    .maybeSingle();
  if (actorRoleError || !actorRole) {
    return NextResponse.json({ error: "A verified administrator identity is required." }, { status: 403, headers: responseHeaders });
  }

  const cooldownStart = new Date(Date.now() - stagingVolunteerInviteCooldownMinutes * 60_000).toISOString();
  const { data: recent, error: recentError } = await service
    .from("staging_volunteer_password_setup_tokens")
    .select("token_hash")
    .eq("user_id", user.id)
    .gte("created_at", cooldownStart)
    .is("consumed_at", null)
    .limit(1);
  if (recentError) {
    return NextResponse.json({ error: "Staging invitation service is temporarily unavailable." }, { status: 503, headers: responseHeaders });
  }
  if (recent?.length) {
    return NextResponse.json({ error: "A recent setup invitation is already active." }, { status: 429, headers: responseHeaders });
  }

  let deliveryFailureReason = "unexpected_failure";
  try {
    await recordAuditEvent({
      actorId: actor.id,
      action: "staging_volunteer_invitation_requested",
      metadata: { recipient: "configured-staging-recipient" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to record the invitation request." }, { status: 503, headers: responseHeaders });
  }

  const capability = createStagingVolunteerSetupCapability();
  const { error: tokenError } = await service.from("staging_volunteer_password_setup_tokens").insert({
    token_hash: capability.tokenHash,
    user_id: user.id,
    expires_at: new Date(Date.now() + stagingVolunteerSetupLifetimeMinutes * 60_000).toISOString(),
  });
  if (tokenError) {
    return NextResponse.json({ error: "Unable to prepare the setup invitation." }, { status: 503, headers: responseHeaders });
  }

  try {
    const delivery = await sendStagingVolunteerSetup(
      recipient,
      capability.setupUrl,
      `staging-volunteer-setup/${capability.tokenHash}`,
    );
    if (!delivery.accepted) {
      deliveryFailureReason = delivery.reason;
      throw new Error("Delivery was not accepted");
    }
    await recordAuditEvent({
      actorId: actor.id,
      action: "staging_volunteer_invitation_sent",
      metadata: { recipient: "configured-staging-recipient" },
    });
    return NextResponse.json({ ok: true }, { headers: responseHeaders });
  } catch {
    await service.from("staging_volunteer_password_setup_tokens")
      .delete()
      .eq("token_hash", capability.tokenHash)
      .is("consumed_at", null);
    try {
      await recordAuditEvent({
        actorId: actor.id,
        action: "staging_volunteer_invitation_failed",
        metadata: { recipient: "configured-staging-recipient", reason: deliveryFailureReason },
      });
    } catch {
      // Do not mask a safe delivery failure with a second error.
    }
    return NextResponse.json({ error: "Invitation delivery could not be confirmed." }, { status: 502, headers: responseHeaders });
  }
}
