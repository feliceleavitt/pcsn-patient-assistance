import { createHash, randomBytes } from "crypto";

export function normalizeCaregiverEmail(value: string) {
  return value.trim().toLowerCase();
}

export function hashCaregiverInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createCaregiverInvitationToken() {
  return randomBytes(32).toString("base64url");
}
