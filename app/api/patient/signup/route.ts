import { NextResponse } from "next/server";
import { z } from "zod";
import { patientCookieName } from "@/lib/security/patient";
import { createAnonServerClient, createServiceClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const service = createServiceClient();
  const { error: createError } = await service.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }

  const anon = createAnonServerClient();
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: "Account exists. Please sign in with your password." },
      { status: 409 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(patientCookieName, data.session.access_token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: data.session.expires_in,
  });
  return response;
}
