import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  promoteNextFromWaitlist: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  promoteNextFromWaitlist: mocks.promoteNextFromWaitlist
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/promote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method, auth and eventId", async () => {
    const { default: handler } = await import("./promote");

    const resMethod = createRes();
    await handler({ method: "GET", headers: {}, body: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "POST", headers: {}, body: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);

    const resEvent = createRes();
    await handler(
      { method: "POST", headers: { "x-admin-email": "admin@example.com" }, body: {} } as any,
      resEvent as any
    );
    expect(resEvent.statusCode).toBe(400);
  });

  it("returns promote result", async () => {
    mocks.promoteNextFromWaitlist.mockResolvedValueOnce({ status: "promoted", user_id: "u1" });
    const { default: handler } = await import("./promote");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ status: "promoted", user_id: "u1" });
  });

  it("returns 500 on failure", async () => {
    mocks.promoteNextFromWaitlist.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("./promote");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
