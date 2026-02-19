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
});
