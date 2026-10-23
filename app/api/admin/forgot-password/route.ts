import { NextResponse } from "next/server";
import { z } from "zod";
import { createAnonServerClient, createServiceClient } from "@/lib/supabase/server";
import { isVolunteerEmail } from "@/lib/security/volunteers";
import { createVolunteerResetToken, resetEmailIdempotencyKey } from "@/lib/security/volunteer-password-reset";
import { sendVolunteerPasswordReset } from "@/lib/notifications/email";

const schema = z.object({ email: z.string().trim().email().max(254) });

function isAllowedPreviewRecoveryRecipient(email: string) {
  if (process.env.VERCEL_ENV !== "preview") return true;
  const allowed = process.env.STAGING_TEST_EMAIL_RECIPIENT?.trim().toLowerCase();
  return Boolean(allowed && allowed === email);
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  try {
    // Preview can only send recovery messages to the one explicitly approved
    // staging recipient. This applies before either Auth or legacy credentials
    // attempt email delivery.
    if (!isAllowedPreviewRecoveryRecipient(email)) {
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (isVolunteerEmail(email)) {
      const service = createServiceClient();
      const { data, error } = await service.from("volunteer_credentials")
        .select("password_salt").eq("email", email).maybeSingle<{ password_salt: string }>();
      if (error) throw new Error("Credential lookup failed");

      // Accounts that use the normal Supabase Auth + admin_roles path must use
      // Supabase's recovery email. It establishes the Auth session required by
      // the volunteer login fallback and avoids a second, unrelated password.
      if (!data) {
        const supabase = createAnonServerClient();
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email);
        if (recoveryError) throw new Error("Auth recovery request failed");
        return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      }

      // Legacy credential records retain their existing dedicated reset flow.
      // Use a configured origin, never a request-supplied host for recovery links.
      const origin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
      if (origin.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("HTTPS required");
      if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM_EMAIL) throw new Error("Email not configured");
      const token = createVolunteerResetToken(email, data?.password_salt ?? null);
      const resetUrl = new URL("/admin/reset-password", origin);
      // Fragments are not sent to servers, access logs, or referrer headers.
      resetUrl.hash = new URLSearchParams({ token }).toString();
      const sent = await sendVolunteerPasswordReset(email, resetUrl.toString(), resetEmailIdempotencyKey(token));
      if (!sent) console.error("Volunteer recovery email delivery failed");
    }
  } catch {
    // Never log addresses, tokens, credentials, or provider response bodies.
    console.error("Volunteer password recovery request could not be processed");
  }
  // Same response for all syntactically valid addresses, including delivery errors.
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
