import crypto from "node:crypto";
import type { AdminRole } from "@/lib/types";

const defaultVolunteerEmails = [
  "feliceleavitt01@gmail.com",
  "jenny.martin@pcsnetwork.org",
  "sam.martin@pcsnetwork.org",
  "suzanne.victor@pcsnetwork.org",
];

const sessionTtlSeconds = 60 * 60 * 8;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getVolunteerEmails() {
  const configured = process.env.VOLUNTEER_EMAILS?.split(",")
    .map(normalizeEmail)
    .filter(Boolean);

  return new Set(configured?.length ? configured : defaultVolunteerEmails);
}

function getSharedPassword() {
  return process.env.VOLUNTEER_SHARED_PASSWORD ?? "";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.VOLUNTEER_SESSION_SECRET ?? "";
}

function sign(value: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isVolunteerEmail(email: string | null | undefined) {
  if (!email) return false;
  return getVolunteerEmails().has(normalizeEmail(email));
}

export function authenticateVolunteer(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const sharedPassword = getSharedPassword();
  if (!sharedPassword || !isVolunteerEmail(normalizedEmail)) return null;
  if (!safeEqual(password, sharedPassword)) return null;

  return {
    id: `volunteer:${normalizedEmail}`,
    email: normalizedEmail,
    role: "admin" as AdminRole,
  };
}

export function createVolunteerSessionToken(email: string) {
  const payload = base64UrlEncode(
    JSON.stringify({
      email: normalizeEmail(email),
      exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds,
    }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyVolunteerSessionToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let expectedSignature: string;
  try {
    expectedSignature = sign(payload);
  } catch {
    return null;
  }
  if (!safeEqual(signature, expectedSignature)) return null;

  let parsed: { email?: string; exp?: number };
  try {
    parsed = JSON.parse(base64UrlDecode(payload)) as {
      email?: string;
      exp?: number;
    };
  } catch {
    return null;
  }
  if (!parsed.email || !parsed.exp) return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  if (!isVolunteerEmail(parsed.email)) return null;

  const email = normalizeEmail(parsed.email);
  return {
    user: { id: `volunteer:${email}`, email },
    role: "admin" as AdminRole,
  };
}

export { sessionTtlSeconds };
