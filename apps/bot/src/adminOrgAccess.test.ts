import { describe, expect, it, vi } from "vitest";
import { requireOrganizationAccess } from "./adminOrgAccess";

vi.mock("@event/db", () => ({
  assertUserOrganizationAccess: vi.fn(async () => false),
  assertEventInOrg: vi.fn(async () => false)
}));

describe("requireOrganizationAccess", () => {
  it("allows global admin without membership check", async () => {
    process.env.ADMIN_REQUIRE_ORG_CONTEXT = "true";
    const res: any = {
      status: vi.fn(() => res),
      json: vi.fn(() => res)
    };
    const result = await requireOrganizationAccess(
      {} as any,
      res,
      {} as any,
      {
        requestId: "r1",
        principal: {
          userId: "admin-user",
          telegramId: 1,
          role: "admin",
          iat: 0,
          exp: 999999
        }
      } as any,
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });
});
