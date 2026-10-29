import { randomBytes } from "node:crypto";
import { hashStagingVolunteerSetupToken } from "./staging-volunteer-setup";

export const stagingVolunteerOrigin =
  "https://pcsn-patient-assistance-git-codex-audited-catalog-preview-pcsn.vercel.app";
export const stagingVolunteerInviteCooldownMinutes = 15;
export const stagingVolunteerSetupLifetimeMinutes = 30;

export function configuredStagingVolunteerRecipient() {
  if (process.env.VERCEL_ENV !== "preview") return null;
  const recipient = process.env.STAGING_TEST_EMAIL_RECIPIENT?.trim().toLowerCase();
  return recipient || null;
}

export function createStagingVolunteerSetupCapability() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashStagingVolunteerSetupToken(token),
    setupUrl: `${stagingVolunteerOrigin}/admin/setup-password#token=${token}`,
  };
}
