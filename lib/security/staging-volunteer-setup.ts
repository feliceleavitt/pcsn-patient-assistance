import { createHash } from "node:crypto";

export function hashStagingVolunteerSetupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isPreviewDeployment() {
  return process.env.VERCEL_ENV === "preview";
}
