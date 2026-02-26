import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn()
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOtp: mocks.signInWithOtp
    }
  }))
}));

describe("POST /api/admin/auth/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("returns 400 for invalid email", async () => {
    const { default: handler } = await import("../../../api/admin/auth/email");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { email: "bad" } } as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns 200 for valid email", async () => {
    mocks.signInWithOtp.mockResolvedValueOnce({ error: null });
    const { default: handler } = await import("../../../api/admin/auth/email");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { email: "Admin@Example.com" } } as any, res as any);

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "admin@example.com",
      options: { shouldCreateUser: false }
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true });
  });

  it("returns 403 for email outside allowlist", async () => {
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    const { default: handler } = await import("../../../api/admin/auth/email");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { email: "other@example.com" } } as any, res as any);

    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ message: "admin_email_not_allowed" });
  });

  it("returns 429 when supabase rate limit is reached", async () => {
    mocks.signInWithOtp.mockResolvedValueOnce({
      error: { code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" }
    });
    const { default: handler } = await import("../../../api/admin/auth/email");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { email: "admin@example.com" } } as any, res as any);

    expect(res.statusCode).toBe(429);
    expect(res.payload).toEqual({
      message: "Too many OTP requests. Please wait a few minutes and try again."
    });
  });

  it("returns 403 when otp is disabled for requested email", async () => {
    mocks.signInWithOtp.mockResolvedValueOnce({
      error: { code: "otp_disabled", status: 422, message: "Signups not allowed for otp" }
    });
    const { default: handler } = await import("../../../api/admin/auth/email");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { email: "admin@example.com" } } as any, res as any);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ message: "admin_email_not_allowed" });
  });
});
