import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/catalog/origin";
import { preflightStagingVolunteerInvitation, sendStagingVolunteerSetup } from "@/lib/notifications/email";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import {
  createStagingVolunteerSetupCapability,
  stagingVolunteerInviteCooldownMinutes,
  stagingVolunteerSetupLifetimeMinutes,
} from "@/lib/security/staging-volunteer-invitation";
import { isVolunteerEmail } from "@/lib/security/volunteers";
import { isPreviewDeployment } from "@/lib/security/staging-volunteer-setup";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const responseHeaders = { "Cache-Control": "no-store" };
const invitationSchema = z.object({
  action: z.enum(["status", "preflight", "send"]).default("send"),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
});

async function findAuthUsersByEmail(
  service: ReturnType<typeof createServiceClient>,
  emails: string[],
) {
  const wanted = new Set(emails.map((email) => email.toLowerCase()));
  const found = new Map<string, { id: string; email?: string }>();
  const perPage = 100;
  for (let page = 1; page <= 20 && found.size < wanted.size; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) return { error };
    const users = data.users;
    for (const candidate of users) {
      const email = candidate.email?.toLowerCase();
      if (email && wanted.has(email)) found.set(email, candidate);
    }
    if (users.length < perPage) break;
  }
  return { users: found };
}

export async function POST(request: Request) {
  if (!isPreviewDeployment()) return new NextResponse(null, { status: 404 });
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: responseHeaders });
  }

  const session = await requireAdminSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Volunteer administrator access is required." }, { status: 403, headers: responseHeaders });
  }

  const parsed = invitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid approved volunteer email address." }, { status: 400, headers: responseHeaders });
  }
  const { action, email: recipient } = parsed.data;
  if (!isVolunteerEmail(recipient)) {
    return NextResponse.json({ error: "This address is not approved for staging volunteer access." }, { status: 403, headers: responseHeaders });
  }

  const service = createServiceClient();
  const actorEmail = session.user.email?.toLowerCase();
  if (!actorEmail) {
    return NextResponse.json({ error: "A verified administrator identity is required." }, { status: 403, headers: responseHeaders });
  }
  const authLookup = await findAuthUsersByEmail(service, [recipient, actorEmail]);
  const user = authLookup.users?.get(recipient);
  const actor = authLookup.users?.get(actorEmail);
  if (authLookup.error) {
    return NextResponse.json({ error: "Staging identity lookup is temporarily unavailable." }, { status: 503, headers: responseHeaders });
  }
  if (!user) {
    return NextResponse.json({ error: "This approved volunteer has no matching staging identity." }, { status: 409, headers: responseHeaders });
  }
  const { data: role, error: roleError } = await service
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !role) {
    return NextResponse.json({ error: "This staging identity is not authorized as a volunteer administrator." }, { status: 409, headers: responseHeaders });
  }
  // Established volunteers use the signed, server-verified credential session
  // (`volunteer:<email>`). It has no matching Supabase Auth session, but
  // requireAdminSession has already verified its credential record and role.
  // Use that stable actor identifier for audit logging rather than rejecting a
  // legitimate administrator who is already signed into the dashboard.
  const actorId = actor?.id ?? session.user.id;
  if (actor) {
    const { data: actorRole, error: actorRoleError } = await service
      .from("admin_roles")
      .select("role")
      .eq("user_id", actor.id)
      .eq("role", "admin")
      .maybeSingle();
    if (actorRoleError || !actorRole) {
      return NextResponse.json({ error: "A verified administrator identity is required." }, { status: 403, headers: responseHeaders });
    }
  } else if (session.user.id !== `volunteer:${actorEmail}`) {
    return NextResponse.json({ error: "A verified administrator identity is required." }, { status: 403, headers: responseHeaders });
  }

  const { data: latestInvitation, error: latestInvitationError } = await service
    .from("staging_volunteer_password_setup_tokens")
    .select("expires_at,consumed_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestInvitationError) {
    return NextResponse.json({ error: "Staging invitation service is temporarily unavailable." }, { status: 503, headers: responseHeaders });
  }
  const invitationStatus = !latestInvitation
    ? "not_sent"
    : latestInvitation.consumed_at
      ? "accepted"
      : new Date(latestInvitation.expires_at) <= new Date()
        ? "expired"
        : "pending";

  if (action === "status") {
    return NextResponse.json({ email: recipient, status: invitationStatus }, { headers: responseHeaders });
  }

  const deliveryPreflight = await preflightStagingVolunteerInvitation();
  if (action === "preflight") {
    return NextResponse.json({ email: recipient, status: invitationStatus, delivery: deliveryPreflight.ready ? "ready" : "not_ready" }, { headers: responseHeaders });
  }
  if (!deliveryPreflight.ready) {
    return NextResponse.json({ error: "Email delivery is not ready. Check the approved Resend sender configuration." }, { status: 503, headers: responseHeaders });
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
      actorId,
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
      actorId,
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
        actorId,
        action: "staging_volunteer_invitation_failed",
        metadata: { recipient: "configured-staging-recipient", reason: deliveryFailureReason },
      });
    } catch {
      // Do not mask a safe delivery failure with a second error.
    }
    return NextResponse.json({ error: "Invitation delivery could not be confirmed." }, { status: 502, headers: responseHeaders });
  }
}
