import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1";

function encryptionKey(): Buffer {
  const secret =
    process.env.EMAIL_ENCRYPTION_KEY?.trim() || process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Email credentials can't be stored: set EMAIL_ENCRYPTION_KEY (or BETTER_AUTH_SECRET).",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Output: `v1.<iv>.<ciphertext>.<tag>` (base64url). */
export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    PREFIX,
    iv.toString("base64url"),
    data.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function decryptSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (!value.startsWith(`${PREFIX}.`)) return value;
  const [prefix, ivPart, dataPart, tagPart] = value.split(".");
  if (prefix !== PREFIX || !ivPart || !dataPart || !tagPart) return "";
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}
