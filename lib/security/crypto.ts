import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey() {
  const encoded = process.env.FILE_ENCRYPTION_KEY_BASE64;
  if (!encoded) throw new Error("Missing FILE_ENCRYPTION_KEY_BASE64");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("FILE_ENCRYPTION_KEY_BASE64 must decode to 32 bytes");
  }
  return key;
}

export function encryptBuffer(input: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptBuffer(input: Buffer, iv: string, tag: string) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(input), decipher.final()]);
}
