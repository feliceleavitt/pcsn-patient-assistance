import { NextResponse } from "next/server";
import { z } from "zod";
import { createAnonServerClient } from "@/lib/supabase/server";

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
  const supabase = createAnonServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email.toLowerCase(),
    { redirectTo: `${origin}/patient/reset-password` },
  );

  if (error) {
    console.error("Unable to request patient password reset:", error.message);
  }

  // Always return the same response so this endpoint cannot be used to discover
  // whether a patient has an account.
  return NextResponse.json({ ok: true });
}
