import { NextResponse } from "next/server";

const cookieName =
  process.env.ADMIN_SESSION_COOKIE_NAME ?? "pcsn_admin_session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(cookieName);
  return response;
}
