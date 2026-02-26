import { describe, expect, it, vi } from "vitest";
import {
  closeEvent,
  createEvent,
  getEventById,
  getEventStats,
  listAllEvents,
  listEventAttendees,
  listEventQuestions,
  listEventWaitlist,
  listPublishedEvents,
  saveEventAttendeeOrder,
  saveEventAttendeeRowColor,
  promoteNextFromWaitlist,
  publishEvent,
  upsertEventQuestions
} from "./events";

describe("events data layer", () => {
  it("listPublishedEvents maps rows", async () => {
    const order = vi.fn(async () => ({
      data: [{ id: "e1", title: "T", description: null, starts_at: "2026", ends_at: null, capacity: 10, registration_success_message: null, status: "published" }],
      error: null
    }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order };
    const db = { from: vi.fn(() => query) } as any;

    const result = await listPublishedEvents(db);

    expect(result[0]).toEqual({
      id: "e1",
      title: "T",
      description: null,
      startsAt: "2026",
      endsAt: null,
      capacity: 10,
      registrationSuccessMessage: null,
      status: "published"
    });
  });

  it("createEvent inserts draft event", async () => {
    const single = vi.fn(async () => ({
      data: { id: "e1", title: "T", description: "D", starts_at: "2026", ends_at: null, capacity: 10, status: "draft" },
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
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), maybeSingle };
    const db = { from: vi.fn(() => query) } as any;

    await expect(getEventById(db, "missing")).resolves.toBeNull();
  });

  it("getEventById maps event when found", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        id: "e1",
        title: "Team Event",
        description: "Desc",
        starts_at: "2026-03-01T10:00:00Z",
        ends_at: "2026-03-01T12:00:00Z",
        capacity: 30,
        registration_success_message: "Welcome!",
        status: "published"
      },
      error: null
    }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), maybeSingle };
    const db = { from: vi.fn(() => query) } as any;

    const result = await getEventById(db, "e1");
    expect(result).toEqual(
      expect.objectContaining({
        id: "e1",
        title: "Team Event",
        registrationSuccessMessage: "Welcome!",
        status: "published"
      })
    );
  });

  it("publishEvent and closeEvent update lifecycle", async () => {
    const maybeSinglePublish = vi.fn(async () => ({
      data: { id: "e1", title: "T", description: null, starts_at: "2026", ends_at: null, capacity: 10, status: "published" },
      error: null
    }));
    const maybeSingleClose = vi.fn(async () => ({
      data: { id: "e1", title: "T", description: null, starts_at: "2026", ends_at: null, capacity: 10, status: "closed" },
      error: null
    }));

    const publishQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn(() => ({ maybeSingle: maybeSinglePublish }))
    };
    const closeQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
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
      data: [{ id: "e1", title: "All", description: null, starts_at: "2026", ends_at: null, capacity: 1, status: "draft" }],
      error: null
    }));
    const db = {
      from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order }))
    } as any;

    const result = await listAllEvents(db);
    expect(result[0].title).toBe("All");
  });

  it("listEventAttendees maps attendees and applies custom order", async () => {
    const order = vi.fn(async () => ({
      data: [
        {
          user_id: "u2",
          status: "registered",
          payment_status: "mock_paid",
          created_at: "2026-02-18T11:00:00Z",
          users: { full_name: "John", username: "john", telegram_id: 2 }
        },
        {
          user_id: "u1",
          status: "cancelled",
          payment_status: "mock_paid",
          created_at: "2026-02-18T10:00:00Z",
          users: { full_name: "Jane", username: "jane", telegram_id: 1 }
        }
      ],
      error: null
    }));
    const registrationsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order };
    const checkinsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ data: [{ user_id: "u2" }], error: null }))
    };
    const answersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({
        data: [
          {
            user_id: "u2",
            question_id: "q1",
            question_version: 1,
            answer_text: "Networking",
            is_skipped: false,
            created_at: "2026-02-18T10:00:00Z",
            event_registration_questions: { prompt: "Why join?" }
          }
        ],
        error: null
      }))
    };
    const attendeeOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({
        data: [
          { user_id: "u2", display_order: 1, row_color: "#AABBCC" },
          { user_id: "u1", display_order: 2, row_color: null }
        ],
        error: null
      }))
    };
    const db = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        if (table === "checkins") return checkinsQuery;
        if (table === "registration_question_answers") return answersQuery;
        if (table === "event_attendee_order") return attendeeOrderQuery;
        throw new Error(`Unexpected table: ${table}`);
      })
    } as any;

    const result = await listEventAttendees(db, "e1");
    expect(result.map((item) => item.userId)).toEqual(["u2", "u1"]);
    expect(result[0]).toEqual(
      expect.objectContaining({
        fullName: "John",
        checkedIn: true,
        userId: "u2",
        displayOrder: 1,
        rowColor: "#AABBCC",
        answers: [
          {
            questionId: "q1",
            questionVersion: 1,
            prompt: "Why join?",
            answerText: "Networking",
            isSkipped: false,
            createdAt: "2026-02-18T10:00:00Z"
          }
        ]
      })
    );
    expect(result[1]).toEqual(expect.objectContaining({ displayOrder: 2, rowColor: null, status: "cancelled" }));
  });

  it("listEventAttendees sorts ordered attendees before unordered ones", async () => {
    const registrationsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({
        data: [
          {
            user_id: "u1",
            status: "registered",
            payment_status: "mock_paid",
            created_at: "2026-02-18T10:00:00Z",
            users: { full_name: "A", username: "a", telegram_id: 1 }
          },
          {
            user_id: "u2",
            status: "registered",
            payment_status: "mock_paid",
            created_at: "2026-02-18T09:00:00Z",
            users: { full_name: "B", username: "b", telegram_id: 2 }
          }
        ],
        error: null
      }))
    };
    const attendeeOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({
        data: [{ user_id: "u2", display_order: 1, row_color: null }],
        error: null
      }))
    };
    const checkinsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn(async () => ({ data: [], error: null })) };
    const answersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ data: [], error: null }))
    };
    const db = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        if (table === "event_attendee_order") return attendeeOrderQuery;
        if (table === "checkins") return checkinsQuery;
        if (table === "registration_question_answers") return answersQuery;
        throw new Error(`Unexpected table: ${table}`);
      })
    } as any;

    const result = await listEventAttendees(db, "e1");
    expect(result.map((item) => item.userId)).toEqual(["u2", "u1"]);
  });

  it("listEventAttendees falls back to registeredAt when both attendees are unordered", async () => {
    const registrationsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({
        data: [
          {
            user_id: "u-late",
            status: "registered",
            payment_status: "mock_paid",
            created_at: "2026-02-18T11:00:00Z",
            users: { full_name: "Late", username: "late", telegram_id: 11 }
          },
          {
            user_id: "u-early",
            status: "registered",
            payment_status: "mock_paid",
            created_at: "2026-02-18T10:00:00Z",
            users: { full_name: "Early", username: "early", telegram_id: 10 }
          }
        ],
        error: null
      }))
    };
    const attendeeOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ data: [], error: null }))
    };
    const checkinsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn(async () => ({ data: [], error: null })) };
    const answersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ data: [], error: null }))
    };
    const db = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        if (table === "event_attendee_order") return attendeeOrderQuery;
        if (table === "checkins") return checkinsQuery;
        if (table === "registration_question_answers") return answersQuery;
        throw new Error(`Unexpected table: ${table}`);
      })
    } as any;

    const result = await listEventAttendees(db, "e1");
    expect(result.map((item) => item.userId)).toEqual(["u-early", "u-late"]);
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

  it("saveEventAttendeeOrder calls rpc", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const db = { rpc } as any;

    await saveEventAttendeeOrder(db, "e1", ["u1", "u2"]);

    expect(rpc).toHaveBeenCalledWith("upsert_event_attendee_order", {
      p_event_id: "e1",
      p_user_ids: ["u1", "u2"]
    });
  });

  it("saveEventAttendeeRowColor calls rpc", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const db = { rpc } as any;

    await saveEventAttendeeRowColor(db, "e1", "u1", "#AABBCC");

    expect(rpc).toHaveBeenCalledWith("upsert_event_attendee_row_color", {
      p_event_id: "e1",
      p_user_id: "u1",
      p_row_color: "#AABBCC"
    });
  });

  it("listEventQuestions and upsertEventQuestions call rpc", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: "q1",
            event_id: "e1",
            version: 1,
            prompt: "Why join?",
            is_required: true,
            position: 1,
            is_active: true
          }
        ],
        error: null
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "q2",
            event_id: "e1",
            version: 1,
            prompt: "Meal pref",
            is_required: false,
            position: 1,
            is_active: true
          }
        ],
        error: null
      });
    const db = { rpc } as any;

    const listed = await listEventQuestions(db, "e1");
    const saved = await upsertEventQuestions(db, "e1", [{ prompt: "Meal pref", isRequired: false, position: 1 }]);

    expect(rpc).toHaveBeenNthCalledWith(1, "list_active_event_questions", { p_event_id: "e1" });
    expect(rpc).toHaveBeenNthCalledWith(2, "upsert_event_questions", {
      p_event_id: "e1",
      p_questions: [{ id: undefined, prompt: "Meal pref", isRequired: false, position: 1 }]
    });
    expect(listed[0].id).toBe("q1");
    expect(saved[0].id).toBe("q2");
  });

  it("throws on db errors", async () => {
    const order = vi.fn(async () => ({ data: null, error: new Error("boom") }));
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order };
    const db = { from: vi.fn(() => query) } as any;

    await expect(listPublishedEvents(db)).rejects.toThrow("boom");
  });

  it("throws when attendee order/checkins/answers queries fail", async () => {
    const registrationsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ data: [], error: null }))
    };
    const attendeeOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ data: null, error: new Error("order failed") }))
    };
    const checkinsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ data: [], error: null }))
    };
    const answersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ data: [], error: null }))
    };
    const dbOrderFail = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        if (table === "event_attendee_order") return attendeeOrderQuery;
        if (table === "checkins") return checkinsQuery;
        if (table === "registration_question_answers") return answersQuery;
        throw new Error(`Unexpected table: ${table}`);
      })
    } as any;

    await expect(listEventAttendees(dbOrderFail, "e1")).rejects.toThrow("order failed");

    const attendeeOrderOk = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ data: [], error: null }))
    };
    const checkinsFail = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ data: null, error: new Error("checkins failed") }))
    };
    const dbCheckinsFail = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        if (table === "event_attendee_order") return attendeeOrderOk;
        if (table === "checkins") return checkinsFail;
        if (table === "registration_question_answers") return answersQuery;
        throw new Error(`Unexpected table: ${table}`);
      })
    } as any;

    await expect(listEventAttendees(dbCheckinsFail, "e1")).rejects.toThrow("checkins failed");

    const checkinsOk = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ data: [], error: null }))
    };
    const answersFail = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ data: null, error: new Error("answers failed") }))
    };
    const dbAnswersFail = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return registrationsQuery;
        if (table === "event_attendee_order") return attendeeOrderOk;
        if (table === "checkins") return checkinsOk;
        if (table === "registration_question_answers") return answersFail;
        throw new Error(`Unexpected table: ${table}`);
      })
    } as any;

    await expect(listEventAttendees(dbAnswersFail, "e1")).rejects.toThrow("answers failed");
  });

  it("throws when attendee order/color RPC fails", async () => {
    const dbOrder = { rpc: vi.fn(async () => ({ data: null, error: new Error("rpc order failed") })) } as any;
    await expect(saveEventAttendeeOrder(dbOrder, "e1", ["u1"])).rejects.toThrow("rpc order failed");

    const dbColor = { rpc: vi.fn(async () => ({ data: null, error: new Error("rpc color failed") })) } as any;
    await expect(saveEventAttendeeRowColor(dbColor, "e1", "u1", "#AABBCC")).rejects.toThrow("rpc color failed");
  });

  it("returns empty questions list when rpc returns null data", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const db = { rpc } as any;

    await expect(listEventQuestions(db, "e1")).resolves.toEqual([]);
    await expect(upsertEventQuestions(db, "e1", [])).resolves.toEqual([]);
  });

  it("throws when waitlist query fails", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ data: null, error: new Error("waitlist failed") }))
    };
    const db = { from: vi.fn(() => query) } as any;

    await expect(listEventWaitlist(db, "e1")).rejects.toThrow("waitlist failed");
  });

  it("throws when stats queries fail", async () => {
    const regFail: any = { select: vi.fn().mockReturnThis(), eq: vi.fn() };
    regFail.eq.mockReturnValueOnce(regFail).mockResolvedValueOnce({ count: 0, error: new Error("reg failed") });
    const checkOk: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    const waitOk: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    const dbRegFail = {
      from: vi.fn((table: string) => (table === "registrations" ? regFail : table === "checkins" ? checkOk : waitOk))
    } as any;
    await expect(getEventStats(dbRegFail, "e1")).rejects.toThrow("reg failed");

    const regOk: any = { select: vi.fn().mockReturnThis(), eq: vi.fn() };
    regOk.eq.mockReturnValueOnce(regOk).mockResolvedValueOnce({ count: 1, error: null });
    const checkFail: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 0, error: new Error("check failed") }) };
    const dbCheckFail = {
      from: vi.fn((table: string) => (table === "registrations" ? regOk : table === "checkins" ? checkFail : waitOk))
    } as any;
    await expect(getEventStats(dbCheckFail, "e1")).rejects.toThrow("check failed");

    const regOk2: any = { select: vi.fn().mockReturnThis(), eq: vi.fn() };
    regOk2.eq.mockReturnValueOnce(regOk2).mockResolvedValueOnce({ count: 1, error: null });
    const checkOk2: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    const waitFail: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 0, error: new Error("wait failed") }) };
    const dbWaitFail = {
      from: vi.fn((table: string) => (table === "registrations" ? regOk2 : table === "checkins" ? checkOk2 : waitFail))
    } as any;
    await expect(getEventStats(dbWaitFail, "e1")).rejects.toThrow("wait failed");
  });
});
