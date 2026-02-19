import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => {
  const query: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis()
  };

  return {
    query,
    db: { from: vi.fn(() => query) },
    logError: vi.fn()
  };
});

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db)
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("/api/admin/event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method and auth", async () => {
    const { default: handler } = await import("../../../api/admin/event");

    const resMethod = createRes();
    await handler({ method: "POST", headers: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "GET", headers: {}, query: { eventId: "e1" } } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);
  });

  it("returns event by id", async () => {
    mocks.query.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "e1",
        title: "Team",
        description: null,
        location: null,
        starts_at: "2026-03-01T10:00:00Z",
        capacity: 20,
        status: "published"
      },
      error: null
    });

    const { default: handler } = await import("../../../api/admin/event");
    const res = createRes();

    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" }, query: { eventId: "e1" } } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload?.event?.id).toBe("e1");
  });

  it("updates event", async () => {
    mocks.query.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "e1",
        title: "Team Updated",
        description: "desc",
        location: "HQ",
        starts_at: "2026-03-02T10:00:00Z",
        capacity: 25,
        status: "draft"
      },
      error: null
    });

    const { default: handler } = await import("../../../api/admin/event");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: "Team Updated",
          startsAt: "2026-03-02T10:00:00Z",
          capacity: 25,
          description: "desc",
          location: "HQ"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload?.event?.title).toBe("Team Updated");
  });
});
