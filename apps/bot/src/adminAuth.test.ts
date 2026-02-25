import { afterEach, describe, expect, it } from "vitest";
import { isAdminRequest } from "./adminAuth";
import { createSessionToken } from "./adminSession";

function setBaseEnv() {
  process.env.TELEGRAM_BOT_TOKEN = "token";
  process.env.TELEGRAM_WEBHOOK_SECRET = "secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
}

describe("isAdminRequest", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAIL_ALLOWLIST;
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.ADMIN_AUTH_ALLOW_EMAIL_FALLBACK;
  });

  it("returns true when x-admin-email is in allowlist", () => {
    setBaseEnv();
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com, second@example.com";

    const req = {
      headers: {
        "x-admin-email": "admin@example.com"
      }
    } as any;

    expect(isAdminRequest(req)).toBe(true);
  });

  it("returns false when email is not allowed", () => {
    setBaseEnv();
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";

    const req = {
      headers: {
        "x-admin-email": "user@example.com"
      }
    } as any;

    expect(isAdminRequest(req)).toBe(false);
  });

  it("returns true for valid admin session cookie", () => {
    setBaseEnv();
    process.env.ADMIN_SESSION_SECRET = "secret-session";

    const token = createSessionToken(
      {
        userId: "u1",
        authUserId: "auth-u1",
        telegramId: 123,
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600
      },
      process.env.ADMIN_SESSION_SECRET
    );
    const req = {
      headers: {
        cookie: `admin_session=${token}`
      }
    } as any;

    expect(isAdminRequest(req)).toBe(true);
  });

  it("can disable header fallback via ADMIN_AUTH_ALLOW_EMAIL_FALLBACK", () => {
    setBaseEnv();
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    process.env.ADMIN_AUTH_ALLOW_EMAIL_FALLBACK = "false";

    const req = {
      headers: {
        "x-admin-email": "admin@example.com"
      }
    } as any;

    expect(isAdminRequest(req)).toBe(false);
  });
});
