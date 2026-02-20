import { describe, expect, it } from "vitest";
import {
  clearAdminSession,
  createSessionToken,
  getAdminPrincipal,
  setAdminSession,
  verifySessionToken
} from "./adminSession";

describe("adminSession", () => {
  it("signs and verifies token", () => {
    const now = Date.UTC(2026, 1, 20, 10, 0, 0);
    const token = createSessionToken(
      {
        userId: "u1",
        telegramId: 123,
        role: "organizer",
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + 60
      },
      "secret"
    );

    const parsed = verifySessionToken(token, "secret", now);
    expect(parsed?.userId).toBe("u1");
    expect(parsed?.role).toBe("organizer");
  });

  it("rejects tampered or expired token", () => {
    const now = Date.UTC(2026, 1, 20, 10, 0, 0);
    const token = createSessionToken(
      {
        userId: "u1",
        telegramId: 123,
        role: "admin",
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + 10
      },
      "secret"
    );
    expect(verifySessionToken(`${token}x`, "secret", now)).toBeNull();
    expect(verifySessionToken(token, "secret", now + 11_000)).toBeNull();
  });

  it("writes/reads/clears cookie", () => {
    const req = { headers: {} as Record<string, string> } as any;
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      }
    } as any;

    const principal = setAdminSession(
      res,
      { userId: "u1", telegramId: 111, role: "admin" },
      { ADMIN_SESSION_SECRET: "secret", NODE_ENV: "test", ADMIN_SESSION_TTL_SECONDS: "120" },
      Date.UTC(2026, 1, 20, 10, 0, 0)
    );
    expect(principal.role).toBe("admin");
    expect(headers["set-cookie"]).toContain("admin_session=");

    const nowSeconds = Math.floor(Date.now() / 1000);
    req.headers.cookie = `admin_session=${createSessionToken(
      {
        userId: "u1",
        telegramId: 111,
        role: "admin",
        iat: nowSeconds - 10,
        exp: nowSeconds + 600
      },
      "secret"
    )}`;

    const fromReq = getAdminPrincipal(req, { ADMIN_SESSION_SECRET: "secret" });
    expect(fromReq?.telegramId).toBe(111);

    clearAdminSession(res, { NODE_ENV: "test" });
    expect(headers["set-cookie"]).toContain("Max-Age=0");
  });
});
