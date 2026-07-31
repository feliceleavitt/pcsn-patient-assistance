import { NextResponse } from "next/server";
import { patientCookieName } from "@/lib/security/patient";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(patientCookieName);
  return response;
}
