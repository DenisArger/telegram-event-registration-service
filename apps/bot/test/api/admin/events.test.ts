import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  listAllEvents: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listAllEvents: mocks.listAllEvents
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return {
    ...actual,
    logError: mocks.logError
  };
});

describe("GET /api/admin/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("returns 405 for non-GET", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler({ method: "POST", headers: {} } as any, res as any);

    expect(res.statusCode).toBe(405);
  });

  it("returns 401 for non-admin request", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler({ method: "GET", headers: {} } as any, res as any);

    expect(res.statusCode).toBe(401);
  });

  it("returns events for admin request", async () => {
    mocks.listAllEvents.mockResolvedValueOnce([{ id: "e1" }]);
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" } } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ events: [{ id: "e1" }] });
  });

  it("returns 500 when db fails", async () => {
    mocks.listAllEvents.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" } } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
