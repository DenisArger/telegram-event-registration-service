import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  db: {
    from: vi.fn()
  },
  logError: vi.fn()
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      verifyOtp: mocks.verifyOtp
    }
  }))
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db)
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.ADMIN_SESSION_SECRET = "session-secret";
    process.env.NODE_ENV = "test";
  });

  it("returns 400 for missing token", async () => {
    const { default: handler } = await import("../../../api/admin/auth/verify");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { email: "admin@example.com" } } as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns 200 and sets cookie on success", async () => {
    mocks.verifyOtp.mockResolvedValueOnce({
      error: null,
      data: { user: { id: "auth-1" } }
    });

    const maybeSingleByAuth = vi.fn(async () => ({ data: null, error: null }));
    const eqByAuth = vi.fn(() => ({ maybeSingle: maybeSingleByAuth }));
    const selectByAuth = vi.fn(() => ({ eq: eqByAuth }));

    const maybeSingleByEmail = vi.fn(async () => ({
      data: { id: "u1", role: "admin", telegram_id: 7, auth_user_id: null, email: "admin@example.com" },
      error: null
    }));
    const eqByEmail = vi.fn(() => ({ maybeSingle: maybeSingleByEmail }));
    const selectByEmail = vi.fn(() => ({ eq: eqByEmail }));

    const singleAfterUpdate = vi.fn(async () => ({
      data: { id: "u1", role: "admin", telegram_id: 7, auth_user_id: "auth-1", email: "admin@example.com" },
      error: null
    }));
    const selectAfterUpdate = vi.fn(() => ({ single: singleAfterUpdate }));
    const eqAfterUpdate = vi.fn(() => ({ select: selectAfterUpdate }));
    const update = vi.fn(() => ({ eq: eqAfterUpdate }));

    mocks.db.from
      .mockImplementationOnce(() => ({ select: selectByAuth }))
      .mockImplementationOnce(() => ({ select: selectByEmail }))
      .mockImplementationOnce(() => ({ update }));

    const { default: handler } = await import("../../../api/admin/auth/verify");
    const res = createRes();
    await handler(
      { method: "POST", headers: {}, body: { email: "Admin@Example.com", token: "123456" } } as any,
      res as any
    );

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      email: "admin@example.com",
      token: "123456",
      type: "email"
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ ok: true, role: "admin", userId: "u1", authUserId: "auth-1" });
    expect(res.headers["set-cookie"]).toContain("admin_session=");
  });

  it("falls back to magiclink verification type", async () => {
    mocks.verifyOtp
      .mockResolvedValueOnce({ error: { message: "otp_expired", name: "AuthApiError" }, data: { user: null } })
      .mockResolvedValueOnce({ error: null, data: { user: { id: "auth-2" } } });

    const maybeSingleByAuth = vi.fn(async () => ({
      data: { id: "u2", role: "organizer", telegram_id: null, auth_user_id: "auth-2", email: "admin@example.com" },
      error: null
    }));
    const eqByAuth = vi.fn(() => ({ maybeSingle: maybeSingleByAuth }));
    const selectByAuth = vi.fn(() => ({ eq: eqByAuth }));

    mocks.db.from.mockImplementationOnce(() => ({ select: selectByAuth }));

    const { default: handler } = await import("../../../api/admin/auth/verify");
    const res = createRes();
    await handler(
      { method: "POST", headers: {}, body: { email: "admin@example.com", token: "654321" } } as any,
      res as any
    );

    expect(mocks.verifyOtp).toHaveBeenNthCalledWith(1, {
      email: "admin@example.com",
      token: "654321",
      type: "email"
    });
    expect(mocks.verifyOtp).toHaveBeenNthCalledWith(2, {
      email: "admin@example.com",
      token: "654321",
      type: "magiclink"
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ ok: true, role: "organizer", userId: "u2", authUserId: "auth-2" });
  });
});
