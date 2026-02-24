import crypto from "node:crypto";

function getKeyMaterial(envSource: Record<string, string | undefined>): Buffer {
  const raw = String(envSource.TOKEN_ENCRYPTION_KEY ?? "").trim();
  if (!raw) throw new Error("missing_token_encryption_key");

  try {
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, "hex");
    }
    return crypto.createHash("sha256").update(raw, "utf8").digest();
  } catch {
    throw new Error("invalid_token_encryption_key");
  }
}

export function encryptSecret(
  plaintext: string,
  envSource: Record<string, string | undefined>
): string {
  const iv = crypto.randomBytes(12);
  const key = getKeyMaterial(envSource);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(
  encoded: string,
  envSource: Record<string, string | undefined>
): string {
  const [ivPart, tagPart, dataPart] = encoded.split(".");
  if (!ivPart || !tagPart || !dataPart) throw new Error("invalid_encrypted_secret");

  const key = getKeyMaterial(envSource);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
