import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "../../../src/adminSession";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  listUserOrganizations: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listUserOrganizations: mocks.listUserOrganizations
}));

describe("GET /api/admin/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.ADMIN_SESSION_SECRET = "session-secret";
    mocks.listUserOrganizations.mockResolvedValue([]);
  });

  it("returns 401 without session cookie", async () => {
    const { default: handler } = await import("../../../api/admin/auth/me");
    const res = createRes();
    await handler({ method: "GET", headers: {} } as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it("returns principal with valid session cookie", async () => {
    const token = createSessionToken(
      {
        userId: "u1",
        authUserId: "auth-u1",
        telegramId: 5,
        role: "organizer",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600
      },
      "session-secret"
    );

    const { default: handler } = await import("../../../api/admin/auth/me");
    const res = createRes();
    await handler({ method: "GET", headers: { cookie: `admin_session=${token}` } } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      authenticated: true,
      role: "organizer",
      userId: "u1",
      authUserId: "auth-u1",
      telegramId: 5
    });
  });
});
