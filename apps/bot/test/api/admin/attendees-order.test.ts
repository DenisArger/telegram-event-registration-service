import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  listEventAttendees: vi.fn(),
  saveEventAttendeeOrder: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listEventAttendees: mocks.listEventAttendees,
  saveEventAttendeeOrder: mocks.saveEventAttendeeOrder
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

describe("PUT /api/admin/attendees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method and auth", async () => {
    const { default: handler } = await import("../../../api/admin/attendees");

    const resOptions = createRes();
    await handler({ method: "OPTIONS", headers: {}, query: {} } as any, resOptions as any);
    expect(resOptions.statusCode).toBe(204);

    const resMethod = createRes();
    await handler({ method: "POST", headers: {}, query: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "PUT", headers: {}, body: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const { default: handler } = await import("../../../api/admin/attendees");

    const resEventId = createRes();
    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { orderedUserIds: [U1] }
      } as any,
      resEventId as any
    );
    expect(resEventId.statusCode).toBe(400);

    const resArray = createRes();
    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", orderedUserIds: [] }
      } as any,
      resArray as any
    );
    expect(resArray.statusCode).toBe(400);

    const resUuid = createRes();
    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", orderedUserIds: ["bad"] }
      } as any,
      resUuid as any
    );
    expect(resUuid.statusCode).toBe(400);

    const resDuplicate = createRes();
    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", orderedUserIds: [U1, U1] }
      } as any,
      resDuplicate as any
    );
    expect(resDuplicate.statusCode).toBe(400);
  });

  it("returns 400 when ordered users do not match attendees", async () => {
    mocks.listEventAttendees.mockResolvedValueOnce([{ userId: U1 }, { userId: U2 }]);
    const { default: handler } = await import("../../../api/admin/attendees");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", orderedUserIds: [U1] }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(mocks.saveEventAttendeeOrder).not.toHaveBeenCalled();
  });

  it("saves attendee order", async () => {
    mocks.listEventAttendees.mockResolvedValueOnce([{ userId: U1 }, { userId: U2 }]);
    mocks.saveEventAttendeeOrder.mockResolvedValueOnce(undefined);

    const { default: handler } = await import("../../../api/admin/attendees");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", orderedUserIds: [U2, U1] }
      } as any,
      res as any
    );

    expect(mocks.saveEventAttendeeOrder).toHaveBeenCalledWith(mocks.db, "e1", [U2, U1]);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true });
  });

  it("returns 500 on failure", async () => {
    mocks.listEventAttendees.mockResolvedValueOnce([{ userId: U1 }]);
    mocks.saveEventAttendeeOrder.mockRejectedValueOnce(new Error("boom"));

    const { default: handler } = await import("../../../api/admin/attendees");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", orderedUserIds: [U1] }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
