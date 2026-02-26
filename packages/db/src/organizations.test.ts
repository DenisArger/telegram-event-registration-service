import { describe, expect, it, vi } from "vitest";
import {
  assertEventInOrg,
  assertUserOrganizationAccess,
  createOrganization,
  listOrganizationMembers,
  listUserOrganizations,
  removeOrganizationMember,
  transferOrganizationOwnership,
  getOrganizationTelegramBotTokenEncrypted,
  updateOrganization,
  upsertOrganizationMember
} from "./organizations";

describe("organizations data layer", () => {
  it("creates organization and maps fields", async () => {
    const single = vi.fn(async () => ({
      data: {
        id: "org1",
        name: "Org 1",
        owner_user_id: "u1",
        created_at: "2026-02-24T12:00:00Z"
      },
      error: null
    }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const db = { from: vi.fn(() => ({ insert })) } as any;

    const result = await createOrganization(db, {
      name: "Org 1",
      ownerUserId: "u1",
      telegramBotTokenEncrypted: "enc"
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Org 1",
        owner_user_id: "u1",
        telegram_bot_token_encrypted: "enc"
      })
    );
    expect(result).toEqual({
      id: "org1",
      name: "Org 1",
      ownerUserId: "u1",
      createdAt: "2026-02-24T12:00:00Z"
    });
  });

  it("lists organizations for user", async () => {
    const inFn = vi.fn(async () => ({
      data: [
        {
          role: "owner",
          organizations: {
            id: "org1",
            name: "Org 1",
            owner_user_id: "u1",
            created_at: "2026-02-24T12:00:00Z"
          }
        }
      ],
      error: null
    }));
    const eq = vi.fn(() => ({ in: inFn }));
    const select = vi.fn(() => ({ eq }));
    const db = { from: vi.fn(() => ({ select })) } as any;

    const result = await listUserOrganizations(db, "u1");
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: "org1",
        role: "owner"
      })
    );
  });

  it("lists all organizations for global admin mode", async () => {
    const order = vi.fn(async () => ({
      data: [
        {
          id: "org1",
          name: "Org 1",
          owner_user_id: "u1",
          created_at: "2026-02-24T12:00:00Z"
        },
        {
          id: "org2",
          name: "Org 2",
          owner_user_id: "u2",
          created_at: "2026-02-24T13:00:00Z"
        }
      ],
      error: null
    }));
    const select = vi.fn(() => ({ order }));
    const db = { from: vi.fn(() => ({ select })) } as any;

    const result = await listUserOrganizations(db, "admin-user", { includeAllForAdmin: true });
    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe("owner");
  });

  it("checks org and event scope access", async () => {
    const eqOrg = vi.fn().mockReturnThis();
    const inOrg = vi.fn(async () => ({ count: 1, error: null }));
    const orgQuery = { select: vi.fn().mockReturnThis(), eq: eqOrg, in: inOrg };
    const eqEvent = vi.fn().mockReturnThis();
    const eventQuery = { select: vi.fn().mockReturnThis(), eq: eqEvent };
    eqEvent.mockImplementationOnce(() => eventQuery).mockImplementationOnce(async () => ({ count: 1, error: null }));

    const db = {
      from: vi.fn((table: string) => (table === "organization_members" ? orgQuery : eventQuery))
    } as any;

    await expect(assertUserOrganizationAccess(db, "u1", "org1")).resolves.toBe(true);
    await expect(assertEventInOrg(db, "e1", "org1")).resolves.toBe(true);
  });

  it("lists organization members", async () => {
    const order = vi.fn(async () => ({
      data: [
        {
          organization_id: "org1",
          user_id: "u1",
          role: "owner",
          created_at: "2026-02-25T10:00:00Z",
          users: {
            full_name: "Alice",
            username: "alice",
            telegram_id: 1001
          }
        }
      ],
      error: null
    }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const db = { from: vi.fn(() => ({ select })) } as any;

    const result = await listOrganizationMembers(db, "org1");
    expect(result).toEqual([
      expect.objectContaining({
        organizationId: "org1",
        userId: "u1",
        role: "owner",
        fullName: "Alice"
      })
    ]);
  });

  it("upserts organization member and returns joined user fields", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        organization_id: "org1",
        user_id: "u2",
        role: "admin",
        created_at: "2026-02-25T10:00:00Z",
        users: {
          full_name: "Bob",
          username: null,
          telegram_id: 1002
        }
      },
      error: null
    }));
    const eqMember = vi.fn().mockReturnThis();
    const memberQuery = { select: vi.fn().mockReturnThis(), eq: eqMember, maybeSingle };
    eqMember.mockImplementationOnce(() => memberQuery).mockImplementationOnce(() => memberQuery);

    const upsert = vi.fn(async () => ({ error: null }));
    const db = {
      from: vi.fn((table: string) => {
        if (table === "organization_members") {
          return { upsert, ...memberQuery };
        }
        return {};
      })
    } as any;

    const result = await upsertOrganizationMember(db, { organizationId: "org1", userId: "u2", role: "admin" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org1",
        user_id: "u2",
        role: "admin"
      }),
      { onConflict: "organization_id,user_id" }
    );
    expect(result.userId).toBe("u2");
    expect(result.role).toBe("admin");
  });

  it("removes organization member", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { organization_id: "org1" }, error: null }));
    const eq = vi.fn().mockReturnThis();
    const deleteQuery = { eq, select: vi.fn().mockReturnThis(), maybeSingle };
    eq.mockImplementationOnce(() => deleteQuery).mockImplementationOnce(() => deleteQuery);
    const db = { from: vi.fn(() => ({ delete: vi.fn(() => deleteQuery) })) } as any;

    await expect(removeOrganizationMember(db, "org1", "u1")).resolves.toBe(true);
  });

  it("transfers organization ownership via rpc", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        organization_id: "org1",
        previous_owner_user_id: "u1",
        new_owner_user_id: "u2"
      },
      error: null
    }));
    const db = { rpc } as any;

    const result = await transferOrganizationOwnership(db, {
      organizationId: "org1",
      currentOwnerUserId: "u1",
      newOwnerUserId: "u2"
    });

    expect(rpc).toHaveBeenCalledWith("transfer_organization_ownership", {
      p_organization_id: "org1",
      p_current_owner_user_id: "u1",
      p_new_owner_user_id: "u2"
    });
    expect(result).toEqual({
      organizationId: "org1",
      previousOwnerUserId: "u1",
      newOwnerUserId: "u2"
    });
  });

  it("updates organization fields", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        id: "org1",
        name: "Org Renamed",
        owner_user_id: "u1",
        created_at: "2026-02-24T12:00:00Z"
      },
      error: null
    }));
    const eq = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) }));
    const update = vi.fn(() => ({ eq }));
    const db = { from: vi.fn(() => ({ update })) } as any;

    const result = await updateOrganization(db, { organizationId: "org1", name: "Org Renamed" });
    expect(result?.name).toBe("Org Renamed");
  });

  it("reads encrypted telegram bot token for organization", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { telegram_bot_token_encrypted: "enc-token" },
      error: null
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const db = { from: vi.fn(() => ({ select })) } as any;

    const result = await getOrganizationTelegramBotTokenEncrypted(db, "org1");
    expect(result).toBe("enc-token");
  });
});
