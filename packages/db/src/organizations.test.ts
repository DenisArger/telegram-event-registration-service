import { describe, expect, it, vi } from "vitest";
import {
  assertEventInOrg,
  assertUserOrganizationAccess,
  createOrganization,
  listUserOrganizations
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
});
