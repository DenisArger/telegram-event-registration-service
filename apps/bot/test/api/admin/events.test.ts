import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => {
  const query: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  };

  return {
    query,
    db: {
      from: vi.fn((table: string) => {
        if (table === "events") return query;
        return {};
      })
    },
    listAllEvents: vi.fn(),
    createEvent: vi.fn(),
    upsertEventQuestions: vi.fn(),
    logError: vi.fn()
  };
});

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listAllEvents: mocks.listAllEvents,
  createEvent: mocks.createEvent,
  upsertEventQuestions: mocks.upsertEventQuestions
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return {
    ...actual,
    logError: mocks.logError
  };
});

describe("/api/admin/events", () => {
  const creatorId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    process.env.ADMIN_DEFAULT_CREATOR_ID = creatorId;
  });

  it("returns 405 for unsupported method", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler({ method: "PATCH", headers: {} } as any, res as any);

    expect(res.statusCode).toBe(405);
  });

  it("returns 401 for non-admin request", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler({ method: "GET", headers: {} } as any, res as any);

    expect(res.statusCode).toBe(401);
  });

  it("returns events list for admin request", async () => {
    mocks.listAllEvents.mockResolvedValueOnce([{ id: "e1" }]);
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" }, query: {} } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ events: [{ id: "e1" }] });
  });

  it("returns 500 when events list loading fails", async () => {
    mocks.listAllEvents.mockRejectedValueOnce(new Error("db down"));
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" }, query: {} } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ message: "Failed to load events" });
    expect(mocks.logError).toHaveBeenCalledWith("admin_events_failed", expect.any(Object));
  });

  it("returns event details when eventId is provided", async () => {
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
    const { default: handler } = await import("../../../api/admin/events");
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
    expect(res.payload?.event?.id).toBe("e1");
  });

  it("returns 404 for unknown eventId", async () => {
    mocks.query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "GET",
        headers: { "x-admin-email": "admin@example.com" },
        query: { eventId: "missing" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ message: "Event not found" });
  });

  it("returns 500 for event details when db query fails", async () => {
    mocks.query.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error("select failed") });
    const { default: handler } = await import("../../../api/admin/events");
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
    expect(res.payload).toEqual({ message: "Failed to load event" });
    expect(mocks.logError).toHaveBeenCalledWith("admin_event_get_failed", expect.any(Object));
  });

  it("updates event with PUT", async () => {
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
    const { default: handler } = await import("../../../api/admin/events");
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

  it("returns 400 for PUT when eventId is missing", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: " ",
          title: "Team Updated"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "eventId is required" });
  });

  it("deletes event with DELETE", async () => {
    mocks.query.maybeSingle.mockResolvedValueOnce({ data: { id: "e1" }, error: null });
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "DELETE",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ eventId: "e1" });
    expect(mocks.query.update).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String) }));
  });

  it("returns 400 for DELETE when eventId is missing", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "DELETE",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: " " }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "eventId is required" });
  });

  it("returns 400 for PUT when title is missing", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: " "
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "title is required" });
  });

  it("returns 400 for PUT when endsAt is not greater than startsAt", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: "Team Updated",
          startsAt: "2026-03-02T10:00:00Z",
          endsAt: "2026-03-02T10:00:00Z"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "endsAt must be greater than startsAt" });
  });

  it("returns 400 for PUT when startsAt is invalid", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: "Team Updated",
          startsAt: "not-a-date"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "startsAt must be a valid date" });
  });

  it("returns 400 for PUT when endsAt is invalid", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: "Team Updated",
          startsAt: "2026-03-02T10:00:00Z",
          endsAt: "not-a-date"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "endsAt must be a valid date" });
  });

  it("returns 400 for PUT when capacity is not a positive integer", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: "Team Updated",
          capacity: 0
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "capacity must be a positive integer" });
  });

  it("returns 404 for PUT when event does not exist", async () => {
    mocks.query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "missing",
          title: "Team Updated",
          startsAt: "2026-03-02T10:00:00Z"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ message: "Event not found" });
  });

  it("returns 400 for PUT when registrationSuccessMessage is too long", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: "Team Updated",
          registrationSuccessMessage: "x".repeat(4001)
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "registrationSuccessMessage is too long" });
  });

  it("returns 500 for PUT when update fails", async () => {
    mocks.query.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error("update failed") });
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          title: "Team Updated"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ message: "Failed to update event" });
    expect(mocks.logError).toHaveBeenCalledWith("admin_event_update_failed", expect.any(Object));
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
    mocks.upsertEventQuestions.mockResolvedValueOnce([]);
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
    expect(res.payload).toEqual({ event: { id: "e2", title: "New Event", status: "draft" }, questions: [] });
  });

  it("creates event with questions", async () => {
    mocks.createEvent.mockResolvedValueOnce({ id: "e2", title: "New Event", status: "draft" });
    mocks.upsertEventQuestions.mockResolvedValueOnce([{ id: "q1", prompt: "Why?", isRequired: true }]);
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
          questions: [{ prompt: "Why?", required: true }]
        }
      } as any,
      res as any
    );

    expect(mocks.upsertEventQuestions).toHaveBeenCalledWith(
      mocks.db,
      "e2",
      [{ prompt: "Why?", isRequired: true, position: 1 }]
    );
    expect(res.statusCode).toBe(201);
  });

  it("returns 400 when POST contains too many questions", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();
    const questions = Array.from({ length: 11 }, (_, index) => ({ prompt: `Q${index + 1}`, required: false }));

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          questions
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "questions count must be <= 10" });
  });

  it("returns 400 when POST contains too long success message", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          registrationSuccessMessage: "x".repeat(4001)
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "registrationSuccessMessage is too long" });
  });

  it("returns 400 when POST contains invalid question prompt length", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          questions: [{ prompt: " ", required: true }]
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "question prompt length must be 1..500" });
  });

  it("returns 400 when POST endsAt is not greater than startsAt", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          startsAt: "2026-03-01T10:00:00Z",
          endsAt: "2026-03-01T10:00:00Z"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "endsAt must be greater than startsAt" });
  });

  it("returns 400 when POST startsAt is invalid", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          startsAt: "not-a-date"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "startsAt must be a valid date" });
  });

  it("returns 400 when POST endsAt is invalid", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          startsAt: "2026-03-01T10:00:00Z",
          endsAt: "not-a-date"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "endsAt must be a valid date" });
  });

  it("returns 400 when POST capacity is not a positive integer", async () => {
    const { default: handler } = await import("../../../api/admin/events");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          title: "New Event",
          capacity: 0
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "capacity must be a positive integer" });
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
