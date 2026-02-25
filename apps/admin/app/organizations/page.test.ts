import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_components/organization-selector", () => ({
  OrganizationSelector: () => "org-selector"
}));
vi.mock("./organization-members-manager", () => ({
  OrganizationMembersManager: ({ organizationId }: { organizationId: string }) => `members:${organizationId}`
}));
vi.mock("./organization-settings-manager", () => ({
  OrganizationSettingsManager: ({ selectedOrganizationId }: { selectedOrganizationId: string | null }) =>
    `settings:${selectedOrganizationId ?? "none"}`
}));
vi.mock("../_lib/admin-api", () => ({
  getAuthMe: vi.fn(async () => ({
    authenticated: true,
    userId: "u1",
    organizations: [{ id: "org1", name: "Org 1", role: "owner" }]
  })),
  getOrganizationMembers: vi.fn(async () => [{ userId: "u1", role: "owner" }])
}));

import OrganizationsPage from "./page";

describe("OrganizationsPage", () => {
  it("renders selector and members manager", async () => {
    const html = renderToStaticMarkup(await OrganizationsPage({
      searchParams: Promise.resolve({ organizationId: "org1" })
    } as any));

    expect(html).toContain("org-selector");
    expect(html).toContain("settings:org1");
    expect(html).toContain("members:org1");
  });
});
