import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  markCheckIn: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  markCheckIn: mocks.markCheckIn
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method, auth and required params", async () => {
    const { default: handler } = await import("../../../api/admin/checkin");

    const resMethod = createRes();
    await handler({ method: "GET", headers: {}, body: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "POST", headers: {}, body: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);

    const resPayload = createRes();
    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1" }
      } as any,
      resPayload as any
    );
    expect(resPayload.statusCode).toBe(400);
  });

  it("returns checkin result and defaults method to manual", async () => {
    mocks.markCheckIn.mockResolvedValueOnce({ status: "checked_in" });
    const { default: handler } = await import("../../../api/admin/checkin");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", userId: "u1" }
      } as any,
      res as any
    );

    expect(mocks.markCheckIn).toHaveBeenCalledWith(mocks.db, {
      eventId: "e1",
      userId: "u1",
      method: "manual"
    });
    expect(res.statusCode).toBe(200);
  });

  it("maps registration_not_active to 400", async () => {
    mocks.markCheckIn.mockRejectedValueOnce(new Error("registration_not_active"));
    const { default: handler } = await import("../../../api/admin/checkin");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", userId: "u1", method: "qr" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
  });

  it("returns 500 on unexpected failure", async () => {
    mocks.markCheckIn.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("../../../api/admin/checkin");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { eventId: "e1", userId: "u1", method: "qr" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
