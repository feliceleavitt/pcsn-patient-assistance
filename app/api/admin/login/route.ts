import { NextResponse } from "next/server";
import { createAnonServerClient, createServiceClient } from "@/lib/supabase/server";
import { demoSessionToken, isDemoMode } from "@/lib/demo/admin";

const cookieName =
  process.env.ADMIN_SESSION_COOKIE_NAME ?? "pcsn_admin_session";

export async function POST(request: Request) {
  const body = await request.json();
  if (
    isDemoMode() &&
    body.email === "demo@pcsn.local" &&
    body.password === "demo"
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
  const supabase = createAnonServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const service = createServiceClient();
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
