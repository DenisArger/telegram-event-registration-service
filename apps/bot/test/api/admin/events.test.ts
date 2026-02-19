import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  listAllEvents: vi.fn(),
  createEvent: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listAllEvents: mocks.listAllEvents,
  createEvent: mocks.createEvent
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return {
    ...actual,
    logError: mocks.logError
  };
});

describe("GET /api/admin/events", () => {
  const creatorId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.ADMIN_DEFAULT_CREATOR_ID = creatorId;
  });

  it("returns 405 for unsupported method", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler({ method: "PUT", headers: {} } as any, res as any);

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

  it("returns 500 when creator env is missing for POST", async () => {
    delete process.env.ADMIN_DEFAULT_CREATOR_ID;
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { title: "Team Meetup", startsAt: "2026-03-01T10:00:00Z", capacity: 20 }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ message: "ADMIN_DEFAULT_CREATOR_ID is not configured" });
  });

  it("returns 400 for invalid POST payload", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { title: "  ", startsAt: "not-a-date", capacity: 0 }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "title is required" });
  });

  it("creates event for admin request", async () => {
    mocks.createEvent.mockResolvedValueOnce({ id: "e2", title: "New Event", status: "draft" });
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          startsAt: "2026-03-02T12:00:00Z",
          capacity: 15,
          description: "Quarterly review",
          location: "HQ"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(201);
    expect(mocks.createEvent).toHaveBeenCalledWith(
      mocks.db,
      expect.objectContaining({
        title: "New Event",
        capacity: 15,
        createdBy: creatorId
      })
    );
    expect(res.payload).toEqual({ event: { id: "e2", title: "New Event", status: "draft" } });
  });

  it("returns 500 when event creation fails", async () => {
    mocks.createEvent.mockRejectedValueOnce(new Error("insert failed"));
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { title: "Event", startsAt: "2026-03-01T10:00:00Z", capacity: 10 }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ message: "Failed to create event" });
    expect(mocks.logError).toHaveBeenCalled();
  });
});
