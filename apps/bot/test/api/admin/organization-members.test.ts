import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {},
  listOrganizationMembers: vi.fn(),
  upsertOrganizationMember: vi.fn(),
  removeOrganizationMember: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listOrganizationMembers: mocks.listOrganizationMembers,
  upsertOrganizationMember: mocks.upsertOrganizationMember,
  removeOrganizationMember: mocks.removeOrganizationMember
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("/api/admin/organization-members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("validates method and auth", async () => {
    const { default: handler } = await import("../../../api/admin/organization-members");

    const resMethod = createRes();
    await handler({ method: "PATCH", headers: {} } as any, resMethod as any);
    expect(resMethod.statusCode).toBe(405);

    const resAuth = createRes();
    await handler({ method: "GET", headers: {}, query: {} } as any, resAuth as any);
    expect(resAuth.statusCode).toBe(401);
  });

  it("lists members for organization", async () => {
    mocks.listOrganizationMembers.mockResolvedValueOnce([{ userId: "u1", role: "owner" }]);
    const { default: handler } = await import("../../../api/admin/organization-members");
    const res = createRes();

    await handler(
      {
        method: "GET",
        headers: { "x-admin-email": "admin@example.com" },
        query: { organizationId: "11111111-1111-4111-8111-111111111111" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ members: [{ userId: "u1", role: "owner" }] });
  });

  it("creates member with POST", async () => {
    mocks.upsertOrganizationMember.mockResolvedValueOnce({
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      role: "admin"
    });
    const { default: handler } = await import("../../../api/admin/organization-members");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          userId: "22222222-2222-4222-8222-222222222222",
          role: "admin"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(201);
    expect(res.payload?.member?.role).toBe("admin");
  });

  it("updates member role with PUT", async () => {
    mocks.upsertOrganizationMember.mockResolvedValueOnce({
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      role: "owner"
    });
    const { default: handler } = await import("../../../api/admin/organization-members");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          userId: "22222222-2222-4222-8222-222222222222",
          role: "owner"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload?.member?.role).toBe("owner");
  });

  it("deletes member with DELETE", async () => {
    mocks.removeOrganizationMember.mockResolvedValueOnce(true);
    const { default: handler } = await import("../../../api/admin/organization-members");
    const res = createRes();

    await handler(
      {
        method: "DELETE",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          userId: "22222222-2222-4222-8222-222222222222"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true });
  });

  it("returns 404 when deleting missing member", async () => {
    mocks.removeOrganizationMember.mockResolvedValueOnce(false);
    const { default: handler } = await import("../../../api/admin/organization-members");
    const res = createRes();

    await handler(
      {
        method: "DELETE",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          userId: "22222222-2222-4222-8222-222222222222"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
  });

  it("returns 409 when deleting last owner", async () => {
    mocks.removeOrganizationMember.mockRejectedValueOnce(new Error("last_owner_violation"));
    const { default: handler } = await import("../../../api/admin/organization-members");
    const res = createRes();

    await handler(
      {
        method: "DELETE",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          userId: "22222222-2222-4222-8222-222222222222"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(409);
  });

  it("returns 409 when demoting last owner", async () => {
    mocks.upsertOrganizationMember.mockRejectedValueOnce(new Error("last_owner_violation"));
    const { default: handler } = await import("../../../api/admin/organization-members");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          userId: "22222222-2222-4222-8222-222222222222",
          role: "admin"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(409);
  });
});
