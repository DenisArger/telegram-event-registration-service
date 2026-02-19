import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  closeEvent: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  closeEvent: mocks.closeEvent
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method, auth and eventId", async () => {
    const { default: handler } = await import("../../../api/admin/close");

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

  it("returns 400 when event cannot be closed", async () => {
    mocks.closeEvent.mockResolvedValueOnce(null);
    const { default: handler } = await import("../../../api/admin/close");
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
    expect(res.payload).toEqual({ message: "Event must be in published status" });
  });

  it("returns closed event", async () => {
    mocks.closeEvent.mockResolvedValueOnce({ id: "e1", title: "Team", status: "closed" });
    const { default: handler } = await import("../../../api/admin/close");
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
    expect(res.payload).toEqual({ event: { id: "e1", title: "Team", status: "closed" } });
  });

  it("returns 500 on failure", async () => {
    mocks.closeEvent.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("../../../api/admin/close");
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
    expect(res.payload).toEqual({ message: "Failed to close event" });
    expect(mocks.logError).toHaveBeenCalled();
  });
});
