import { NextResponse } from "next/server";
import { z } from "zod";
import { volunteerPasswordSchema } from "@/lib/security/volunteer-password-reset";
import { hashVolunteerPassword } from "@/lib/security/volunteers";
import { hashStagingVolunteerSetupToken, isPreviewDeployment } from "@/lib/security/staging-volunteer-setup";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const setupSchema = z.object({
  // 32 random bytes encoded as base64url. The raw token is kept in the URL
  // fragment, which browsers do not transmit to Vercel or third parties.
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: volunteerPasswordSchema,
});

export async function POST(request: Request) {
  // This enrollment route is deliberately absent from Production. A token can
  // only be issued manually for an existing staging admin account.
  if (!isPreviewDeployment()) return new NextResponse(null, { status: 404 });

  const parsed = setupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "This password setup link is invalid." }, { status: 400 });
  }

  const passwordRecord = hashVolunteerPassword(parsed.data.password);
  const service = createServiceClient();
  const { data: completed, error } = await service.rpc(
    "complete_staging_volunteer_password_setup",
    {
      p_token_hash: hashStagingVolunteerSetupToken(parsed.data.token),
      p_password_hash: passwordRecord.password_hash,
      p_password_salt: passwordRecord.password_salt,
    },
  );

  if (error || !completed) {
    // Do not reveal whether a token existed, expired, was used, or mapped to a user.
    return NextResponse.json(
      { error: "This password setup link is no longer valid." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
