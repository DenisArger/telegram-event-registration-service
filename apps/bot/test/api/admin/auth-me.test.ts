import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken } from "../../../src/adminSession";
import { createRes, setRequiredEnv } from "../testUtils";

describe("GET /api/admin/auth/me", () => {
  beforeEach(() => {
    setRequiredEnv();
    process.env.ADMIN_SESSION_SECRET = "session-secret";
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
    expect(res.payload).toMatchObject({ authenticated: true, role: "organizer", userId: "u1", telegramId: 5 });
  });
});
