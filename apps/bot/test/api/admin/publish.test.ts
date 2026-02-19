import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  publishEvent: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  publishEvent: mocks.publishEvent
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method, auth and eventId", async () => {
    const { default: handler } = await import("../../../api/admin/publish");

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

  it("returns 400 when event cannot be published", async () => {
    mocks.publishEvent.mockResolvedValueOnce(null);
    const { default: handler } = await import("../../../api/admin/publish");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "Event must be in draft status" });
  });

  it("returns published event", async () => {
    mocks.publishEvent.mockResolvedValueOnce({ id: "e1", title: "Team", status: "published" });
    const { default: handler } = await import("../../../api/admin/publish");
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
    expect(res.payload).toEqual({ event: { id: "e1", title: "Team", status: "published" } });
  });

  it("returns 500 on failure", async () => {
    mocks.publishEvent.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("../../../api/admin/publish");
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
    expect(res.payload).toEqual({ message: "Failed to publish event" });
    expect(mocks.logError).toHaveBeenCalled();
  });
});
