import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  getEventStats: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  getEventStats: mocks.getEventStats
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method, auth and eventId", async () => {
    const { default: handler } = await import("./stats");

    const resMethod = createRes();
    await handler({ method: "POST", headers: {}, query: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "GET", headers: {}, query: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);

    const resEvent = createRes();
    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" }, query: {} } as any,
      resEvent as any
    );
    expect(resEvent.statusCode).toBe(400);
  });

  it("returns stats", async () => {
    mocks.getEventStats.mockResolvedValueOnce({ registeredCount: 1 });
    const { default: handler } = await import("./stats");
    const res = createRes();

    await handler(
      {
        method: "GET",
        headers: { "x-admin-email": "admin@example.com" },
        query: { eventId: "e1" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ stats: { registeredCount: 1 } });
  });

  it("returns 500 on failure", async () => {
    mocks.getEventStats.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("./stats");
    const res = createRes();

    await handler(
      {
        method: "GET",
        headers: { "x-admin-email": "admin@example.com" },
        query: { eventId: "e1" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
