import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyTelegramLoginPayload } from "./adminTelegramAuth";

function signPayload(payload: Record<string, unknown>, botToken: string): string {
  const checkString = Object.keys(payload)
    .filter((key) => key !== "hash" && payload[key] != null && String(payload[key]).length > 0)
    .sort()
    .map((key) => `${key}=${String(payload[key])}`)
    .join("\n");

  const secret = crypto.createHash("sha256").update(botToken).digest();
  return crypto.createHmac("sha256", secret).update(checkString).digest("hex");
}

describe("verifyTelegramLoginPayload", () => {
  it("accepts valid signed payload", () => {
    const now = Date.UTC(2026, 1, 20, 12, 0, 0);
    const authDate = Math.floor(now / 1000) - 120;
    const unsigned = {
      id: 123456,
      first_name: "Alex",
      username: "alex",
      auth_date: authDate
    };
    const hash = signPayload(unsigned, "bot-token");
    const result = verifyTelegramLoginPayload(
      { ...unsigned, hash },
      { TELEGRAM_BOT_TOKEN: "bot-token" },
      now
    );

    expect(result.ok).toBe(true);
    expect(result.payload?.id).toBe(123456);
  });

  it("rejects stale payload", () => {
    const now = Date.UTC(2026, 1, 20, 12, 0, 0);
    const unsigned = {
      id: 1,
      first_name: "A",
      auth_date: Math.floor(now / 1000) - 1_000
    };
    const hash = signPayload(unsigned, "bot-token");
    const result = verifyTelegramLoginPayload(
      { ...unsigned, hash },
      { TELEGRAM_BOT_TOKEN: "bot-token" },
      now
    );

    expect(result).toEqual({ ok: false, error: "stale_telegram_auth" });
  });

  it("rejects invalid signature", () => {
    const now = Date.UTC(2026, 1, 20, 12, 0, 0);
    const result = verifyTelegramLoginPayload(
      {
        id: 1,
        auth_date: Math.floor(now / 1000),
        first_name: "A",
        hash: "0".repeat(64)
      },
      { TELEGRAM_BOT_TOKEN: "bot-token" },
      now
    );
    expect(result).toEqual({ ok: false, error: "invalid_telegram_signature" });
  });
});
