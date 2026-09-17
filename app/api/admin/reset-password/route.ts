import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { hashVolunteerPassword } from "@/lib/security/volunteers";
import { verifyVolunteerResetToken, volunteerPasswordSchema } from "@/lib/security/volunteer-password-reset";

const schema = z.object({ token: z.string().max(2048), password: volunteerPasswordSchema });
const invalidLink = "This reset link is invalid, expired, or already used. Please request a new link.";

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const claims = verifyVolunteerResetToken(parsed.data.token);
  if (!claims) return NextResponse.json({ error: invalidLink }, { status: 400 });

  try {
    const service = createServiceClient();
    const record = { email: claims.email, ...hashVolunteerPassword(parsed.data.password), must_change_password: false };
    // Compare-and-swap consumes a token atomically with the password update.
    // A first-time volunteer uses INSERT (never upsert), so concurrent use loses
    // to the email primary key. Both paths invalidate every older reset link.
    const query = claims.salt === null
      ? service.from("volunteer_credentials").insert(record)
      : service.from("volunteer_credentials").update(record).eq("email", claims.email).eq("password_salt", claims.salt);
    const { data, error } = await query.select("email").maybeSingle();
    if (error?.code === "23505" || (!error && !data)) return NextResponse.json({ error: invalidLink }, { status: 400 });
    if (error) throw new Error("Password update failed");
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(process.env.ADMIN_SESSION_COOKIE_NAME ?? "pcsn_admin_session", "", {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to reset your password right now. Please try again." }, { status: 503 });
  }
}
