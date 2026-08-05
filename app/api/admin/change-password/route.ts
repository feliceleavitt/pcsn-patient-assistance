import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSessionForPasswordChange } from "@/lib/security/admin";
import {
  createVolunteerSessionToken,
  hashVolunteerPassword,
  isVolunteerEmail,
  sessionTtlSeconds,
} from "@/lib/security/volunteers";
import { createServiceClient } from "@/lib/supabase/server";

const cookieName =
  process.env.ADMIN_SESSION_COOKIE_NAME ?? "pcsn_admin_session";

const passwordSchema = z.object({
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .regex(/[A-Z]/, "Use at least one uppercase letter.")
    .regex(/[a-z]/, "Use at least one lowercase letter.")
    .regex(/[0-9]/, "Use at least one number."),
});

export async function POST(request: Request) {
  const session = await requireAdminSessionForPasswordChange();
  if (!isVolunteerEmail(session.user.email)) {
    return NextResponse.json({ error: "Volunteer access required." }, { status: 403 });
  }

  const parsed = passwordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Choose a stronger password." },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const passwordRecord = hashVolunteerPassword(parsed.data.password);
  const { error } = await service.from("volunteer_credentials").upsert({
    email: session.user.email.toLowerCase(),
    ...passwordRecord,
    must_change_password: false,
  });

  if (error) {
    return NextResponse.json(
      { error: "Unable to update password. Please try again." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    cookieName,
    createVolunteerSessionToken(session.user.email, {
      mustChangePassword: false,
    }),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionTtlSeconds,
    },
  );

  return response;
}
