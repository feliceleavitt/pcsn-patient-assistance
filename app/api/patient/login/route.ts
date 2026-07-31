import { NextResponse } from "next/server";
import { z } from "zod";
import { patientCookieName } from "@/lib/security/patient";
import { createAnonServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: "Email or password was not recognized." }, { status: 401 });
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
