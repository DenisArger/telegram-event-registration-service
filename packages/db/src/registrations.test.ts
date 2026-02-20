import { describe, expect, it, vi } from "vitest";
import {
  advanceQuestionSession,
  cancelQuestionSession,
  cancelRegistration,
  completeQuestionSession,
  getActiveQuestionSession,
  getExistingRegistrationStatus,
  getOrCreateQuestionSession,
  getRegistrationQuestions,
  registerForEvent,
  saveAnswersAndRegister
} from "./registrations";

describe("registrations rpc", () => {
  it("calls register_for_event rpc", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "registered" }, error: null }));
    const db = { rpc } as any;

    const result = await registerForEvent(db, "e1", "u1");

    expect(rpc).toHaveBeenCalledWith("register_for_event", {
      p_event_id: "e1",
      p_user_id: "u1"
    });
    expect(result.status).toBe("registered");
  });

  it("calls save_registration_answers_and_register rpc", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "waitlisted", position: 2 }, error: null }));
    const db = { rpc } as any;

    const result = await saveAnswersAndRegister(db, "e1", "u1", [
      { questionId: "q1", answerText: "Hello", isSkipped: false }
    ]);

    expect(rpc).toHaveBeenCalledWith("save_registration_answers_and_register", {
      p_event_id: "e1",
      p_user_id: "u1",
      p_answers: [{ questionId: "q1", answerText: "Hello", isSkipped: false }]
    });
    expect(result.status).toBe("waitlisted");
  });

  it("loads registration questions via rpc", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ id: "q1", event_id: "e1", version: 1, prompt: "Q", is_required: true, position: 1, is_active: true }],
      error: null
    }));
    const db = { rpc } as any;

    const result = await getRegistrationQuestions(db, "e1");
    expect(rpc).toHaveBeenCalledWith("list_active_event_questions", { p_event_id: "e1" });
    expect(result[0].id).toBe("q1");
  });

  it("returns existing registration/waitlist state", async () => {
    const regQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    regQuery.eq
      .mockReturnValueOnce(regQuery)
      .mockReturnValueOnce(regQuery)
      .mockResolvedValueOnce({ count: 1, error: null });

    const dbReg = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return regQuery;
        throw new Error("unexpected");
      })
    } as any;

    const reg = await getExistingRegistrationStatus(dbReg, "e1", "u1");
    expect(reg?.status).toBe("already_registered");

    const regQuery2 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    regQuery2.eq
      .mockReturnValueOnce(regQuery2)
      .mockReturnValueOnce(regQuery2)
      .mockResolvedValueOnce({ count: 0, error: null });

    const waitQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    waitQuery.eq
      .mockReturnValueOnce(waitQuery)
      .mockResolvedValueOnce({ count: 1, error: null });

    const dbWait = {
      from: vi.fn((table: string) => {
        if (table === "registrations") return regQuery2;
        if (table === "waitlist") return waitQuery;
        throw new Error("unexpected");
      })
    } as any;

    const wait = await getExistingRegistrationStatus(dbWait, "e1", "u1");
    expect(wait?.status).toBe("already_waitlisted");
  });

  it("returns null when no existing registration or waitlist", async () => {
    const regQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    regQuery.eq
      .mockReturnValueOnce(regQuery)
      .mockReturnValueOnce(regQuery)
      .mockResolvedValueOnce({ count: 0, error: null });

    const waitQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    waitQuery.eq
      .mockReturnValueOnce(waitQuery)
      .mockResolvedValueOnce({ count: 0, error: null });

    const db = {
      from: vi.fn((table: string) => (table === "registrations" ? regQuery : waitQuery))
    } as any;

    await expect(getExistingRegistrationStatus(db, "e1", "u1")).resolves.toBeNull();
  });

  it("creates/updates/cancels/completes question session", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const single = vi.fn(async () => ({
      data: { current_index: 1, answers_json: [], expires_at: "2026-03-01T10:00:00Z" },
      error: null
    }));

    const sessionsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
      update: vi.fn().mockReturnThis()
    } as any;

    const rpc = vi.fn(async () => ({ data: null, error: null }));

    const db = {
      from: vi.fn((table: string) => {
        if (table === "registration_question_sessions") return sessionsQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
      rpc
    } as any;

    const created = await getOrCreateQuestionSession(db, "e1", "u1", 30);
    expect(created.currentIndex).toBe(1);

    await advanceQuestionSession(db, "e1", "u1", 2, [], 30);
    await cancelQuestionSession(db, "e1", "u1");
    await completeQuestionSession(db, "e1", "u1");

    expect(rpc).toHaveBeenCalledWith("clear_active_question_session", {
      p_event_id: "e1",
      p_user_id: "u1"
    });
  });

  it("returns existing active question session without recreating", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        id: "s1",
        current_index: 2,
        answers_json: [{ questionId: "q1", answerText: "a", isSkipped: false }],
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        status: "active"
      },
      error: null
    }));

    const sessionsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      insert: vi.fn(),
      update: vi.fn().mockReturnThis()
    } as any;

    const db = {
      from: vi.fn(() => sessionsQuery)
    } as any;

    const result = await getOrCreateQuestionSession(db, "e1", "u1", 30);

    expect(result.currentIndex).toBe(2);
    expect(result.isExpired).toBe(false);
    expect(sessionsQuery.insert).not.toHaveBeenCalled();
  });

  it("normalizes null answers_json for active session reads", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        id: "s1",
        current_index: 2,
        answers_json: null,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        status: "active"
      },
      error: null
    }));

    const sessionsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      insert: vi.fn(),
      update: vi.fn().mockReturnThis()
    } as any;

    const db = { from: vi.fn(() => sessionsQuery) } as any;
    const existing = await getOrCreateQuestionSession(db, "e1", "u1");
    expect(existing.answers).toEqual([]);

    const activeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: {
          event_id: "e1",
          current_index: 3,
          answers_json: null,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          status: "active"
        },
        error: null
      }))
    } as any;
    const active = await getActiveQuestionSession({ from: vi.fn(() => activeQuery) } as any, "u1");
    expect(active?.answers).toEqual([]);
  });

  it("expires old session and creates a new one", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        id: "s1",
        current_index: 2,
        answers_json: [],
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        status: "active"
      },
      error: null
    }));

    const single = vi.fn(async () => ({
      data: { current_index: 1, answers_json: [], expires_at: "2026-03-01T10:00:00Z" },
      error: null
    }));

    const sessionsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
      update: vi.fn().mockReturnThis()
    } as any;

    const db = {
      from: vi.fn(() => sessionsQuery)
    } as any;

    const result = await getOrCreateQuestionSession(db, "e1", "u1", 30);

    expect(result.currentIndex).toBe(1);
    expect(sessionsQuery.update).toHaveBeenCalled();
    expect(sessionsQuery.insert).toHaveBeenCalled();
  });

  it("normalizes null answers_json when creating new session", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const single = vi.fn(async () => ({
      data: { current_index: 1, answers_json: null, expires_at: "2026-03-01T10:00:00Z" },
      error: null
    }));
    const sessionsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
      update: vi.fn().mockReturnThis()
    } as any;

    const created = await getOrCreateQuestionSession({ from: vi.fn(() => sessionsQuery) } as any, "e1", "u1");
    expect(created.answers).toEqual([]);
  });

  it("loads active question session by user", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: {
          event_id: "e1",
          current_index: 3,
          answers_json: [],
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          status: "active"
        },
        error: null
      }))
    } as any;
    const db = { from: vi.fn(() => query) } as any;

    const result = await getActiveQuestionSession(db, "u1");
    expect(result?.eventId).toBe("e1");
    expect(result?.isExpired).toBe(false);
  });

  it("returns null for missing active session", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null }))
    } as any;
    const db = { from: vi.fn(() => query) } as any;

    await expect(getActiveQuestionSession(db, "u1")).resolves.toBeNull();
  });

  it("calls cancel_registration rpc", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "cancelled" }, error: null }));
    const db = { rpc } as any;

    const result = await cancelRegistration(db, "e1", "u1");

    expect(rpc).toHaveBeenCalledWith("cancel_registration", {
      p_event_id: "e1",
      p_user_id: "u1"
    });
    expect(result.status).toBe("cancelled");
  });

  it("throws when rpc fails", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: new Error("boom") }));
    const db = { rpc } as any;

    await expect(registerForEvent(db, "e1", "u1")).rejects.toThrow("boom");
  });

  it("throws on registration questions RPC failure", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: new Error("questions fail") }));
    const db = { rpc } as any;

    await expect(getRegistrationQuestions(db, "e1")).rejects.toThrow("questions fail");
  });

  it("throws on existing status query errors", async () => {
    const regQueryFail = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    regQueryFail.eq
      .mockReturnValueOnce(regQueryFail)
      .mockReturnValueOnce(regQueryFail)
      .mockResolvedValueOnce({ count: 0, error: new Error("reg fail") });
    const dbRegFail = { from: vi.fn(() => regQueryFail) } as any;
    await expect(getExistingRegistrationStatus(dbRegFail, "e1", "u1")).rejects.toThrow("reg fail");

    const regQueryOk = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    regQueryOk.eq
      .mockReturnValueOnce(regQueryOk)
      .mockReturnValueOnce(regQueryOk)
      .mockResolvedValueOnce({ count: 0, error: null });

    const waitQueryFail = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    waitQueryFail.eq
      .mockReturnValueOnce(waitQueryFail)
      .mockResolvedValueOnce({ count: 0, error: new Error("wait fail") });
    const dbWaitFail = {
      from: vi.fn((table: string) => (table === "registrations" ? regQueryOk : waitQueryFail))
    } as any;
    await expect(getExistingRegistrationStatus(dbWaitFail, "e1", "u1")).rejects.toThrow("wait fail");
  });

  it("throws on question session mutation failures", async () => {
    const activeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: new Error("active fail") }))
    } as any;
    await expect(getActiveQuestionSession({ from: vi.fn(() => activeQuery) } as any, "u1")).rejects.toThrow("active fail");

    const sessionsExpireFail = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: "s1",
          current_index: 1,
          answers_json: [],
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          status: "active"
        },
        error: null
      })),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn()
    } as any;
    sessionsExpireFail.eq = vi
      .fn()
      .mockReturnValueOnce(sessionsExpireFail)
      .mockReturnValueOnce(sessionsExpireFail)
      .mockReturnValueOnce(sessionsExpireFail)
      .mockResolvedValueOnce({ error: new Error("expire fail") });

    await expect(getOrCreateQuestionSession({ from: vi.fn(() => sessionsExpireFail) } as any, "e1", "u1")).rejects.toThrow("expire fail");

    const updateFailQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    updateFailQuery.eq
      .mockReturnValueOnce(updateFailQuery)
      .mockReturnValueOnce(updateFailQuery)
      .mockResolvedValueOnce({ error: new Error("advance fail") });
    await expect(advanceQuestionSession({ from: vi.fn(() => updateFailQuery) } as any, "e1", "u1", 2, [])).rejects.toThrow("advance fail");

    const cancelFailQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn()
    } as any;
    cancelFailQuery.eq
      .mockReturnValueOnce(cancelFailQuery)
      .mockReturnValueOnce(cancelFailQuery)
      .mockResolvedValueOnce({ error: new Error("cancel fail") });
    await expect(cancelQuestionSession({ from: vi.fn(() => cancelFailQuery) } as any, "e1", "u1")).rejects.toThrow("cancel fail");

    await expect(completeQuestionSession({ rpc: vi.fn(async () => ({ data: null, error: new Error("complete fail") })) } as any, "e1", "u1")).rejects.toThrow("complete fail");
    await expect(cancelRegistration({ rpc: vi.fn(async () => ({ data: null, error: new Error("cancel reg fail") })) } as any, "e1", "u1")).rejects.toThrow("cancel reg fail");
  });
});
