import { describe, expect, it, vi } from "vitest";
import {
  closeEvent,
  createEvent,
  getEventById,
  getEventStats,
  listAllEvents,
  listEventAttendees,
  listEventWaitlist,
  listPublishedEvents,
  promoteNextFromWaitlist,
  publishEvent
} from "./events";

describe("events data layer", () => {
  it("listPublishedEvents maps rows", async () => {
    const order = vi.fn(async () => ({
      data: [{ id: "e1", title: "T", description: null, starts_at: "2026", capacity: 10, status: "published" }],
      error: null
    }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order };
    const db = { from: vi.fn(() => query) } as any;

    const result = await listPublishedEvents(db);

    expect(result[0]).toEqual({
      id: "e1",
      title: "T",
      description: null,
      startsAt: "2026",
      capacity: 10,
      status: "published"
    });
  });

  it("createEvent inserts draft event", async () => {
    const single = vi.fn(async () => ({
      data: { id: "e1", title: "T", description: "D", starts_at: "2026", capacity: 10, status: "draft" },
      error: null
    }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const db = { from: vi.fn(() => ({ insert })) } as any;

    const result = await createEvent(db, {
      title: "T",
      description: "D",
      startsAt: "2026",
      capacity: 10,
      createdBy: "u1"
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", created_by: "u1" })
    );
    expect(result.status).toBe("draft");
  });

  it("getEventById returns null when missing", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle };
    const db = { from: vi.fn(() => query) } as any;

    await expect(getEventById(db, "missing")).resolves.toBeNull();
  });

  it("publishEvent and closeEvent update lifecycle", async () => {
    const maybeSinglePublish = vi.fn(async () => ({
      data: { id: "e1", title: "T", description: null, starts_at: "2026", capacity: 10, status: "published" },
      error: null
    }));
    const maybeSingleClose = vi.fn(async () => ({
      data: { id: "e1", title: "T", description: null, starts_at: "2026", capacity: 10, status: "closed" },
      error: null
    }));

    const publishQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn(() => ({ maybeSingle: maybeSinglePublish }))
    };
    const closeQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn(() => ({ maybeSingle: maybeSingleClose }))
    };
    const db = {
      from: vi.fn((table: string) => (table === "events" ? publishQuery : closeQuery))
    } as any;

    const published = await publishEvent(db, "e1");
    const closed = await closeEvent({ from: vi.fn(() => closeQuery) } as any, "e1");

    expect(published?.status).toBe("published");
    expect(closed?.status).toBe("closed");
  });

  it("listAllEvents maps rows", async () => {
    const order = vi.fn(async () => ({
      data: [{ id: "e1", title: "All", description: null, starts_at: "2026", capacity: 1, status: "draft" }],
      error: null
    }));
    const db = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), order }))
    } as any;

    const result = await listAllEvents(db);
    expect(result[0].title).toBe("All");
  });

  it("listEventAttendees maps nested user/checkin", async () => {
    const order = vi.fn(async () => ({
      data: [
        {
          user_id: "u1",
          status: "registered",
          payment_status: "mock_paid",
          created_at: "2026",
          users: { full_name: "John", username: "john", telegram_id: 1 },
          checkins: [{ id: "c1" }]
        }
      ],
      error: null
    }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order };
    const db = { from: vi.fn(() => query) } as any;

    const result = await listEventAttendees(db, "e1");
    expect(result[0]).toEqual(
      expect.objectContaining({ fullName: "John", checkedIn: true, userId: "u1" })
    );
  });

  it("listEventWaitlist maps nested user", async () => {
    const order = vi.fn(async () => ({
      data: [
        {
          user_id: "u1",
          position: 2,
          created_at: "2026",
          users: { full_name: "Jane", username: null, telegram_id: null }
        }
      ],
      error: null
    }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order };
    const db = { from: vi.fn(() => query) } as any;

    const result = await listEventWaitlist(db, "e1");
    expect(result[0]).toEqual(expect.objectContaining({ fullName: "Jane", position: 2 }));
  });

  it("getEventStats aggregates counts", async () => {
    const registrationsQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    };
    registrationsQuery.eq
      .mockReturnValueOnce(registrationsQuery)
      .mockResolvedValueOnce({ count: 10, error: null });

    const checkinsQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 7, error: null })
    };

    const waitlistQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 3, error: null })
    };

    const db = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        if (table === "checkins") return checkinsQuery;
        if (table === "waitlist") return waitlistQuery;
        throw new Error(`Unexpected table: ${table}`);
      })
    } as any;

    const stats = await getEventStats(db, "e1");

    expect(stats).toEqual({
      eventId: "e1",
      registeredCount: 10,
      checkedInCount: 7,
      waitlistCount: 3,
      noShowRate: 30
    });
  });

  it("promoteNextFromWaitlist calls rpc", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "promoted", user_id: "u1" }, error: null }));
    const db = { rpc } as any;

    const result = await promoteNextFromWaitlist(db, "e1");

    expect(rpc).toHaveBeenCalledWith("promote_next_waitlist", { p_event_id: "e1" });
    expect(result.status).toBe("promoted");
  });

  it("throws on db errors", async () => {
    const order = vi.fn(async () => ({ data: null, error: new Error("boom") }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order };
    const db = { from: vi.fn(() => query) } as any;

    await expect(listPublishedEvents(db)).rejects.toThrow("boom");
  });
});
