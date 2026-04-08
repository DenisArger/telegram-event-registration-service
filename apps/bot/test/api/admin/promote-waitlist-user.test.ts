import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";
import { createSessionToken } from "../../../src/adminSession";

const mocks = vi.hoisted(() => ({
  db: {},
  promoteWaitlistUser: vi.fn(),
  getEventById: vi.fn(),
  getUserById: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  promoteWaitlistUser: mocks.promoteWaitlistUser,
  getEventById: mocks.getEventById,
  getUserById: mocks.getUserById
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/promote-waitlist-user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.TELEGRAM_BOT_TOKEN = "bot-token";
  });

  it("validates method, auth and body", async () => {
    const { default: handler } = await import("../../../api/admin/promote-waitlist-user");

    const resMethod = createRes();
    await handler({ method: "GET", headers: {}, body: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "POST", headers: {}, body: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);

    const resBody = createRes();
    await handler(
      { method: "POST", headers: { "x-admin-email": "admin@example.com" }, body: { eventId: "e1" } } as any,
      resBody as any
    );
    expect(resBody.statusCode).toBe(400);
  });

  it("returns promote result", async () => {
    mocks.promoteWaitlistUser.mockResolvedValueOnce({ status: "promoted", user_id: "u2" });
    mocks.getEventById.mockResolvedValueOnce({ title: "Team Event" });
    mocks.getUserById.mockResolvedValueOnce({ id: "u2", role: "participant", telegramId: 222, fullName: "Jane Doe" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      })
    );

    const { default: handler } = await import("../../../api/admin/promote-waitlist-user");
    const res = createRes();
    const token = createSessionToken(
      { userId: "admin-1", authUserId: "auth-1", telegramId: 111, role: "admin", iat: 0, exp: Math.floor(Date.now() / 1000) + 3600 },
      process.env.ADMIN_SESSION_SECRET ?? "session-secret"
    );

    await handler(
      {
        method: "POST",
        headers: { cookie: `admin_session=${token}` },
        body: { eventId: "e1", userId: "u2" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ status: "promoted", user_id: "u2" });
  });

  it("returns 500 on failure", async () => {
    mocks.promoteWaitlistUser.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("../../../api/admin/promote-waitlist-user");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", userId: "u2" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
