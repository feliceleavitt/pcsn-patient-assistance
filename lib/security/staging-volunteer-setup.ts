import crypto from "node:crypto";

export function hashStagingVolunteerSetupToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isPreviewDeployment() {
  return process.env.VERCEL_ENV === "preview";
}
