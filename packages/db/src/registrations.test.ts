import { describe, expect, it, vi } from "vitest";
import {
  advanceQuestionSession,
  cancelQuestionSession,
  cancelRegistration,
  completeQuestionSession,
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
});
