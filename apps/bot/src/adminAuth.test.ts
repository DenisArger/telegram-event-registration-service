import { afterEach, describe, expect, it } from "vitest";
import { isAdminRequest } from "./adminAuth";

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
});
