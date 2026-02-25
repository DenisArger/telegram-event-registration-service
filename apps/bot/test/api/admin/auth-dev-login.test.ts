import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  getUserByTelegramId: vi.fn(),
  db: {},
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  getUserByTelegramId: mocks.getUserByTelegramId
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/auth/dev-login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.ADMIN_SESSION_SECRET = "session-secret";
    process.env.ADMIN_AUTH_TELEGRAM_ENABLED = "true";
    process.env.ADMIN_UNSAFE_LOGIN_ENABLED = "true";
  });

  it("returns 403 when unsafe login disabled", async () => {
    process.env.ADMIN_UNSAFE_LOGIN_ENABLED = "false";
    const { default: handler } = await import("../../../api/admin/auth/dev-login");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { telegramId: "1" } } as any, res as any);
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 when telegram auth is disabled", async () => {
    process.env.ADMIN_AUTH_TELEGRAM_ENABLED = "false";
    const { default: handler } = await import("../../../api/admin/auth/dev-login");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { telegramId: "1" } } as any, res as any);
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 for invalid telegramId", async () => {
    const { default: handler } = await import("../../../api/admin/auth/dev-login");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { telegramId: "abc" } } as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns 200 and sets cookie for organizer/admin", async () => {
    mocks.getUserByTelegramId.mockResolvedValueOnce({ id: "u1", role: "organizer", telegramId: 123 });
    const { default: handler } = await import("../../../api/admin/auth/dev-login");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { telegramId: "123" } } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true, role: "organizer", userId: "u1" });
    expect(res.headers["set-cookie"]).toContain("admin_session=");
  });
});
