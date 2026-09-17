import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isVolunteerEmail } from "@/lib/security/volunteers";
import { createVolunteerResetToken, resetEmailIdempotencyKey } from "@/lib/security/volunteer-password-reset";
import { sendVolunteerPasswordReset } from "@/lib/notifications/email";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  try {
    // Use a configured origin, never a request-supplied host for recovery links.
    const origin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
    if (origin.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("HTTPS required");
    if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM_EMAIL) throw new Error("Email not configured");
    if (isVolunteerEmail(email)) {
      const service = createServiceClient();
      const { data, error } = await service.from("volunteer_credentials")
        .select("password_salt").eq("email", email).maybeSingle<{ password_salt: string }>();
      if (error) throw new Error("Credential lookup failed");
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
