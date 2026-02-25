import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  transferOrganizationOwnership: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  transferOrganizationOwnership: mocks.transferOrganizationOwnership
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("/api/admin/organization-transfer-ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method and auth", async () => {
    const { default: handler } = await import("../../../api/admin/organization-transfer-ownership");

    const resMethod = createRes();
    await handler({ method: "GET", headers: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "POST", headers: {}, body: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);
  });

  it("transfers ownership", async () => {
    mocks.transferOrganizationOwnership.mockResolvedValueOnce({
      organizationId: "11111111-1111-4111-8111-111111111111",
      previousOwnerUserId: "00000000-0000-0000-0000-000000000001",
      newOwnerUserId: "22222222-2222-4222-8222-222222222222"
    });
    const { default: handler } = await import("../../../api/admin/organization-transfer-ownership");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          newOwnerUserId: "22222222-2222-4222-8222-222222222222"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload?.transfer?.newOwnerUserId).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("maps known errors", async () => {
    const { default: handler } = await import("../../../api/admin/organization-transfer-ownership");

    const resSame = createRes();
    mocks.transferOrganizationOwnership.mockRejectedValueOnce(new Error("owner_transfer_same_user"));
    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          newOwnerUserId: "22222222-2222-4222-8222-222222222222"
        }
      } as any,
      resSame as any
    );
    expect(resSame.statusCode).toBe(400);

    const resForbidden = createRes();
    mocks.transferOrganizationOwnership.mockRejectedValueOnce(new Error("owner_transfer_forbidden"));
    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          newOwnerUserId: "22222222-2222-4222-8222-222222222222"
        }
      } as any,
      resForbidden as any
    );
    expect(resForbidden.statusCode).toBe(403);

    const resNotMember = createRes();
    mocks.transferOrganizationOwnership.mockRejectedValueOnce(new Error("owner_transfer_target_not_member"));
    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          newOwnerUserId: "22222222-2222-4222-8222-222222222222"
        }
      } as any,
      resNotMember as any
    );
    expect(resNotMember.statusCode).toBe(404);
  });
});
