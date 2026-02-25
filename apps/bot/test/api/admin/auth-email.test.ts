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
      options: { shouldCreateUser: true }
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true });
  });
});
