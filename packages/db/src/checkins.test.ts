import { describe, expect, it, vi } from "vitest";
import { markCheckIn } from "./checkins";

function createMockDb(config: {
  registration: any;
  existingCheckin: any;
  insertError?: any;
}) {
  const insert = vi.fn(async () => ({ error: config.insertError ?? null }));

  const registrationsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: config.registration, error: null }))
  };

  const checkinsSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: config.existingCheckin, error: null }))
  };

  const db = {
    from: vi.fn((table: string) => {
      if (table === "registrations") return registrationsQuery;
      if (table === "checkins") {
        return {
          ...checkinsSelectQuery,
          insert
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    })
  };

  return { db: db as any, insert };
}

describe("markCheckIn", () => {
  it("marks check-in for active registration", async () => {
    const { db, insert } = createMockDb({
      registration: { status: "registered" },
      existingCheckin: null
    });

    const result = await markCheckIn(db, {
      eventId: "event-1",
      userId: "user-1"
    });

    expect(result.status).toBe("checked_in");
    expect(insert).toHaveBeenCalledOnce();
  });

  it("returns already_checked_in when checkin exists", async () => {
    const { db, insert } = createMockDb({
      registration: { status: "registered" },
      existingCheckin: { id: "c1" }
    });

    const result = await markCheckIn(db, {
      eventId: "event-1",
      userId: "user-1"
    });

    expect(result.status).toBe("already_checked_in");
    expect(insert).not.toHaveBeenCalled();
  });

  it("throws when registration is not active", async () => {
    const { db } = createMockDb({
      registration: { status: "cancelled" },
      existingCheckin: null
    });

    await expect(
      markCheckIn(db, {
        eventId: "event-1",
        userId: "user-1"
      })
    ).rejects.toThrow("registration_not_active");
  });

  it("throws when registration lookup fails", async () => {
    const regError = new Error("reg_error");
    const registrationsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: regError }))
    };
    const db = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        return { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn() };
      })
    } as any;

    await expect(
      markCheckIn(db, {
        eventId: "event-1",
        userId: "user-1"
      })
    ).rejects.toThrow("reg_error");
  });

  it("throws when insert fails", async () => {
    const { db } = createMockDb({
      registration: { status: "registered" },
      existingCheckin: null,
      insertError: new Error("insert_error")
    });

    await expect(
      markCheckIn(db, {
        eventId: "event-1",
        userId: "user-1"
      })
    ).rejects.toThrow("insert_error");
  });
});
