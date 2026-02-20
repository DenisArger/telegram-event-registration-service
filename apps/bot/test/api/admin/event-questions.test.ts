import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  listEventQuestions: vi.fn(),
  upsertEventQuestions: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listEventQuestions: mocks.listEventQuestions,
  upsertEventQuestions: mocks.upsertEventQuestions
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return {
    ...actual,
    logError: mocks.logError
  };
});

describe("/api/admin/event-questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method and auth", async () => {
    const { default: handler } = await import("../../../api/admin/event-questions");

    const resOptions = createRes();
    await handler({ method: "OPTIONS", headers: {}, query: {} } as any, resOptions as any);
    expect(resOptions.statusCode).toBe(204);
    expect(resOptions.headers["access-control-allow-methods"]).toContain("PUT");

    const resMethod = createRes();
    await handler({ method: "POST", headers: {}, query: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "GET", headers: {}, query: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);
  });

  it("gets questions", async () => {
    mocks.listEventQuestions.mockResolvedValueOnce([{ id: "q1" }]);
    const { default: handler } = await import("../../../api/admin/event-questions");
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
    expect(res.payload).toEqual({ questions: [{ id: "q1" }] });
  });

  it("returns 400 for GET without eventId", async () => {
    const { default: handler } = await import("../../../api/admin/event-questions");
    const res = createRes();

    await handler(
      {
        method: "GET",
        headers: { "x-admin-email": "admin@example.com" },
        query: {}
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "eventId is required" });
  });

  it("returns 500 when get questions fails", async () => {
    mocks.listEventQuestions.mockRejectedValueOnce(new Error("db fail"));
    const { default: handler } = await import("../../../api/admin/event-questions");
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
    expect(res.payload).toEqual({ message: "Failed to load event questions" });
    expect(mocks.logError).toHaveBeenCalledWith("admin_event_questions_get_failed", expect.any(Object));
  });

  it("updates questions", async () => {
    mocks.upsertEventQuestions.mockResolvedValueOnce([{ id: "q1", prompt: "P" }]);
    const { default: handler } = await import("../../../api/admin/event-questions");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          questions: [{ id: "q1", prompt: "P", required: true }]
        }
      } as any,
      res as any
    );

    expect(mocks.upsertEventQuestions).toHaveBeenCalledWith(
      mocks.db,
      "e1",
      [{ id: "q1", prompt: "P", isRequired: true, position: 1 }]
    );
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 for PUT without eventId", async () => {
    const { default: handler } = await import("../../../api/admin/event-questions");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { questions: [] }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "eventId is required" });
  });

  it("returns 400 for invalid questions payload", async () => {
    const { default: handler } = await import("../../../api/admin/event-questions");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          questions: [{ prompt: "  " }]
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "question prompt length must be 1..500" });
  });

  it("returns 400 when questions is not an array", async () => {
    const { default: handler } = await import("../../../api/admin/event-questions");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          questions: "not-array"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "questions must be an array" });
  });

  it("returns 400 when questions count is above limit", async () => {
    const { default: handler } = await import("../../../api/admin/event-questions");
    const res = createRes();
    const questions = Array.from({ length: 11 }, (_, index) => ({ prompt: `Q${index + 1}` }));

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          questions
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ message: "questions count must be <= 10" });
  });

  it("returns 500 when update questions fails", async () => {
    mocks.upsertEventQuestions.mockRejectedValueOnce(new Error("update fail"));
    const { default: handler } = await import("../../../api/admin/event-questions");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          eventId: "e1",
          questions: [{ prompt: "Question", required: false }]
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ message: "Failed to update event questions" });
    expect(mocks.logError).toHaveBeenCalledWith("admin_event_questions_put_failed", expect.any(Object));
  });
});
