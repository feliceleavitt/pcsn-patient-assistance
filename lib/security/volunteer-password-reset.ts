import crypto from "node:crypto";
import { z } from "zod";
import { isVolunteerEmail } from "./volunteers";

export const volunteerPasswordSchema = z.string()
  .min(10, "Use at least 10 characters.")
  .max(256, "Use no more than 256 characters.")
  .regex(/[A-Z]/, "Use at least one uppercase letter.")
  .regex(/[a-z]/, "Use at least one lowercase letter.")
  .regex(/[0-9]/, "Use at least one number.");

const claimsSchema = z.object({
  purpose: z.literal("volunteer-password-reset"),
  email: z.string().email(),
  salt: z.string().nullable(),
  exp: z.number().int(),
});

function sign(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.VOLUNTEER_SESSION_SECRET;
  if (!secret) throw new Error("Volunteer password recovery is not configured");
  // Domain separation prevents a recovery token being accepted as a login session.
  return crypto.createHmac("sha256", secret)
    .update(`volunteer-password-reset:${payload}`).digest("base64url");
}

export function createVolunteerResetToken(email: string, salt: string | null, now = Date.now()) {
  // Five-minute buckets give duplicate requests identical email bodies, allowing
  // the email provider to deduplicate them across serverless instances.
  const issuedAt = Math.floor(now / 300_000) * 300;
  const payload = Buffer.from(JSON.stringify({
    purpose: "volunteer-password-reset",
    email: email.trim().toLowerCase(), salt, exp: issuedAt + 1800,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyVolunteerResetToken(token: string, now = Date.now()) {
  try {
    if (token.length > 2048) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
    const parsed = claimsSchema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (!parsed.success || parsed.data.exp <= Math.floor(now / 1000) || !isVolunteerEmail(parsed.data.email)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function resetEmailIdempotencyKey(token: string) {
  return `volunteer-reset/${crypto.createHash("sha256").update(token).digest("hex")}`;
}
