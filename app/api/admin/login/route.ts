import { NextResponse } from "next/server";
import { createAnonServerClient, createServiceClient } from "@/lib/supabase/server";
import { demoSessionToken, isDemoMode } from "@/lib/demo/admin";
import {
  authenticateVolunteer,
  createVolunteerSessionToken,
  hashVolunteerPassword,
  isVolunteerEmail,
  sessionTtlSeconds,
  verifyVolunteerPassword,
} from "@/lib/security/volunteers";

const cookieName =
  process.env.ADMIN_SESSION_COOKIE_NAME ?? "pcsn_admin_session";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (
    isDemoMode() &&
    email === "demo@pcsn.local" &&
    password === "demo"
  ) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, demoSessionToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  }

  const service = createServiceClient();

  if (isVolunteerEmail(email)) {
    const { data: credential } = await service
      .from("volunteer_credentials")
      .select("email,password_hash,password_salt,must_change_password")
      .eq("email", email)
      .maybeSingle<{
        email: string;
        password_hash: string;
        password_salt: string;
        must_change_password: boolean;
      }>();

    if (credential) {
      const validPassword = verifyVolunteerPassword(
        password,
        credential.password_hash,
        credential.password_salt,
      );
      if (!validPassword) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const response = NextResponse.json({
        ok: true,
        mustChangePassword: credential.must_change_password,
      });
      let token: string;
      try {
        token = createVolunteerSessionToken(email, {
          mustChangePassword: credential.must_change_password,
        });
      } catch {
        return NextResponse.json(
          { error: "Volunteer login is not configured" },
          { status: 500 },
        );
      }
      response.cookies.set(cookieName, token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: sessionTtlSeconds,
      });
      return response;
    }
  }

  const volunteer = authenticateVolunteer(email, password);
  if (volunteer) {
    const passwordRecord = hashVolunteerPassword(password);
    await service.from("volunteer_credentials").upsert({
      email: volunteer.email,
      ...passwordRecord,
      must_change_password: true,
    });

    const response = NextResponse.json({ ok: true, mustChangePassword: true });
    let token: string;
    try {
      token = createVolunteerSessionToken(volunteer.email, {
        mustChangePassword: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Volunteer login is not configured" },
        { status: 500 },
      );
    }
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionTtlSeconds,
    });
    return response;
  }
  const supabase = createAnonServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!isVolunteerEmail(data.user.email)) {
    return NextResponse.json({ error: "Volunteer access required" }, { status: 403 });
  }

  const { data: role } = await service
    .from("admin_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!role) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, data.session.access_token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: data.session.expires_in,
  });
  return response;
}
