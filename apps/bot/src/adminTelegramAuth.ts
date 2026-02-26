import crypto from "node:crypto";

export interface TelegramLoginPayload {
  id: number;
  authDate: number;
  hash: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
}

export type TelegramPayloadError =
  | "invalid_payload"
  | "missing_bot_token"
  | "invalid_telegram_signature"
  | "stale_telegram_auth";

export interface TelegramPayloadVerificationResult {
  ok: boolean;
  error?: TelegramPayloadError;
  payload?: TelegramLoginPayload;
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function safeCompareHex(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left, "hex");
  const rightBuf = Buffer.from(right, "hex");
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function normalizePayload(raw: any): TelegramLoginPayload | null {
  const idNum = Number(raw?.id);
  const authDateNum = Number(raw?.auth_date);
  const hash = toStringOrNull(raw?.hash);

  if (!Number.isSafeInteger(idNum) || idNum <= 0) return null;
  if (!Number.isSafeInteger(authDateNum) || authDateNum <= 0) return null;
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;

  return {
    id: idNum,
    authDate: authDateNum,
    hash: hash.toLowerCase(),
    firstName: toStringOrNull(raw?.first_name),
    lastName: toStringOrNull(raw?.last_name),
    username: toStringOrNull(raw?.username),
    photoUrl: toStringOrNull(raw?.photo_url)
  };
}

function buildDataCheckString(raw: Record<string, unknown>): string {
  return Object.keys(raw)
    .filter((key) => key !== "hash" && raw[key] != null && String(raw[key]).length > 0)
    .sort()
    .map((key) => `${key}=${String(raw[key])}`)
    .join("\n");
}

export function verifyTelegramLoginPayload(
  raw: any,
  envSource: Record<string, string | undefined>,
  nowMs = Date.now(),
  botTokenOverride?: string
): TelegramPayloadVerificationResult {
  const botToken = String(botTokenOverride ?? envSource.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!botToken) return { ok: false, error: "missing_bot_token" };

  const normalized = normalizePayload(raw);
  if (!normalized) return { ok: false, error: "invalid_payload" };

  const dataCheckString = buildDataCheckString(raw ?? {});
  const secret = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex")
    .toLowerCase();

  if (!safeCompareHex(expectedHash, normalized.hash)) {
    return { ok: false, error: "invalid_telegram_signature" };
  }

  const maxAgeSeconds = 5 * 60 + 60;
  const nowSeconds = Math.floor(nowMs / 1000);
  const age = nowSeconds - normalized.authDate;
  if (age > maxAgeSeconds || age < -60) {
    return { ok: false, error: "stale_telegram_auth" };
  }

  return { ok: true, payload: normalized };
}
