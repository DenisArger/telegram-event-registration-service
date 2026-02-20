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

describe("POST /api/admin/auth/telegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.ADMIN_SESSION_SECRET = "session-secret";
    process.env.NODE_ENV = "test";
  });

  it("returns 405 for non-post", async () => {
    const { default: handler } = await import("../../../api/admin/auth/telegram");
    const res = createRes();
    await handler({ method: "GET", headers: {} } as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 on invalid payload", async () => {
    const { default: handler } = await import("../../../api/admin/auth/telegram");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: {} } as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it("returns 200 and sets cookie for allowed role", async () => {
    const now = Date.UTC(2026, 1, 20, 12, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const authDate = Math.floor(now / 1000) - 10;
    const payload = {
      id: 123,
      first_name: "Alex",
      auth_date: authDate
    } as any;
    const crypto = await import("node:crypto");
    const check = Object.keys(payload)
      .sort()
      .map((key) => `${key}=${String(payload[key])}`)
      .join("\n");
    const secret = crypto.createHash("sha256").update("token").digest();
    payload.hash = crypto.createHmac("sha256", secret).update(check).digest("hex");

    mocks.getUserByTelegramId.mockResolvedValueOnce({ id: "u1", role: "admin", telegramId: 123 });

    const { default: handler } = await import("../../../api/admin/auth/telegram");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: payload } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true, role: "admin", userId: "u1" });
    expect(res.headers["set-cookie"]).toContain("admin_session=");

    vi.useRealTimers();
  });
});
