import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  listEventAttendees: vi.fn(),
  listEventWaitlist: vi.fn(),
  buildEventExportCsv: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listEventAttendees: mocks.listEventAttendees,
  listEventWaitlist: mocks.listEventWaitlist
}));

vi.mock("../../../src/csv", () => ({
  buildEventExportCsv: mocks.buildEventExportCsv
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("GET /api/admin/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method, auth and eventId", async () => {
    const { default: handler } = await import("../../../api/admin/export");

    const resMethod = createRes();
    await handler({ method: "POST", headers: {}, query: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "GET", headers: {}, query: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);

    const resEvent = createRes();
    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" }, query: {} } as any,
      resEvent as any
    );
    expect(resEvent.statusCode).toBe(400);
  });

  it("returns csv with download headers", async () => {
    mocks.listEventAttendees.mockResolvedValueOnce([{ userId: "u1" }]);
    mocks.listEventWaitlist.mockResolvedValueOnce([{ userId: "u2" }]);
    mocks.buildEventExportCsv.mockReturnValueOnce("csv-content");

    const { default: handler } = await import("../../../api/admin/export");
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
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("event-e1.csv");
    expect(res.payload).toBe("csv-content");
  });

  it("returns 500 when export fails", async () => {
    mocks.listEventAttendees.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("../../../api/admin/export");
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
    expect(mocks.logError).toHaveBeenCalled();
  });
});
