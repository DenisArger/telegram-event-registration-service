import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  db: {
    from: vi.fn(() => ({
      upsert: vi.fn(async () => ({ error: null }))
    }))
  },
  listUserOrganizations: vi.fn(),
  createOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => mocks.db),
  listUserOrganizations: mocks.listUserOrganizations,
  createOrganization: mocks.createOrganization,
  updateOrganization: mocks.updateOrganization
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("/api/admin/organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("lists organizations", async () => {
    mocks.listUserOrganizations.mockResolvedValueOnce([{ id: "org1", name: "Org 1", role: "owner" }]);
    const { default: handler } = await import("../../../api/admin/organizations");
    const res = createRes();

    await handler(
      { method: "GET", headers: { "x-admin-email": "admin@example.com" } } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.organizations).toHaveLength(1);
  });

  it("updates organization with PUT", async () => {
    mocks.updateOrganization.mockResolvedValueOnce({
      id: "org1",
      name: "Org Renamed",
      ownerUserId: "u1",
      createdAt: "2026-02-25T10:00:00Z"
    });
    const { default: handler } = await import("../../../api/admin/organizations");
    const res = createRes();

    await handler(
      {
        method: "PUT",
        headers: { "x-admin-email": "admin@example.com" },
        body: {
          organizationId: "11111111-1111-4111-8111-111111111111",
          name: "Org Renamed"
        }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.organization?.name).toBe("Org Renamed");
  });
});
