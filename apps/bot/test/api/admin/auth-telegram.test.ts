import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  getUserByTelegramId: vi.fn(),
  getOrganizationTelegramBotTokenEncrypted: vi.fn(),
  db: {},
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  getUserByTelegramId: mocks.getUserByTelegramId,
  getOrganizationTelegramBotTokenEncrypted: mocks.getOrganizationTelegramBotTokenEncrypted
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/auth/telegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.TOKEN_ENCRYPTION_KEY = "test-token-encryption-key";
    process.env.ADMIN_SESSION_SECRET = "session-secret";
    process.env.ADMIN_AUTH_TELEGRAM_ENABLED = "true";
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

  it("returns 403 when telegram auth is disabled", async () => {
    process.env.ADMIN_AUTH_TELEGRAM_ENABLED = "false";
    const { default: handler } = await import("../../../api/admin/auth/telegram");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: {} } as any, res as any);
    expect(res.statusCode).toBe(403);
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

  it("uses organization telegram token when organizationId is provided", async () => {
    const now = Date.UTC(2026, 1, 20, 12, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const { encryptSecret } = await import("../../../src/crypto");
    const orgBotToken = "org-token";
    const encrypted = encryptSecret(orgBotToken, process.env);
    mocks.getOrganizationTelegramBotTokenEncrypted.mockResolvedValueOnce(encrypted);

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
    const secret = crypto.createHash("sha256").update(orgBotToken).digest();
    payload.hash = crypto.createHmac("sha256", secret).update(check).digest("hex");

    mocks.getUserByTelegramId.mockResolvedValueOnce({ id: "u1", role: "admin", telegramId: 123 });

    const { default: handler } = await import("../../../api/admin/auth/telegram");
    const res = createRes();
    await handler(
      { method: "POST", headers: {}, query: { organizationId: "org1" }, body: payload } as any,
      res as any
    );

    expect(mocks.getOrganizationTelegramBotTokenEncrypted).toHaveBeenCalledWith(mocks.db, "org1");
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true, role: "admin", userId: "u1" });

    vi.useRealTimers();
  });
});
