import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPatientPasswordReset } from "@/lib/notifications/email";
import { createServiceClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the email address used for your application." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const supabase = createServiceClient();
  const email = parsed.data.email.toLowerCase();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    console.error("Unable to request patient password reset:", error.message);
  } else if (data.properties?.hashed_token) {
    const resetUrl = `${origin}/patient/reset-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
    await sendPatientPasswordReset(email, resetUrl);
  }

  // Always return the same response so this endpoint cannot be used to discover
  // whether a patient has an account.
  return NextResponse.json({ ok: true });
}
