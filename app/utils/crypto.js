import crypto from "node:crypto";
import assert from "node:assert";

const ALGORITHM = "aes-256-gcm";

const KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || "7a8e99523a80bfe2e50a3e1dd6fad28f2f7eb853e829252de365ee8422778d82",
  "hex"
);

assert(KEY.length === 32, "ENCRYPTION_KEY must be 32 bytes");

/**
 * Encrypt text
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    KEY,
    iv
  );

  let encrypted = cipher.update(
    text,
    "utf8",
    "hex"
  );

  encrypted += cipher.final("hex");

  const authTag = cipher
    .getAuthTag()
    .toString("hex");

  return [
    iv.toString("hex"),
    authTag,
    encrypted
  ].join(":");
}

/**
 * Decrypt text
 */
export function decrypt(payload) {
  const [ivHex, authTagHex, encrypted] =
    payload.split(":");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(
    Buffer.from(authTagHex, "hex")
  );

  let decrypted = decipher.update(
    encrypted,
    "hex",
    "utf8"
  );

  decrypted += decipher.final("utf8");

  return decrypted;
}