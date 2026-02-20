import { beforeEach, describe, expect, it } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

describe("POST /api/admin/auth/logout", () => {
  beforeEach(() => {
    setRequiredEnv();
  });

  it("returns 405 for unsupported method", async () => {
    const { default: handler } = await import("../../../api/admin/auth/logout");
    const res = createRes();
    await handler({ method: "GET", headers: {} } as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("clears cookie on logout", async () => {
    const { default: handler } = await import("../../../api/admin/auth/logout");
    const res = createRes();
    await handler({ method: "POST", headers: {} } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true });
    expect(res.headers["set-cookie"]).toContain("Max-Age=0");
  });
});
