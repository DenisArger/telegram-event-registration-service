import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("parses valid env", () => {
    const env = loadEnv({
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_WEBHOOK_SECRET: "secret",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      ADMIN_EMAIL_ALLOWLIST: "admin@example.com"
    });

    expect(env.TELEGRAM_BOT_TOKEN).toBe("token");
    expect(env.SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("throws on missing required env", () => {
    expect(() =>
      loadEnv({
        TELEGRAM_BOT_TOKEN: "token"
      })
    ).toThrow();
  });
});
