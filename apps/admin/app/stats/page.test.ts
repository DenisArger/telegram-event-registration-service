import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_components/event-selector", () => ({
  EventSelector: () => "selector"
}));
vi.mock("../_components/organization-selector", () => ({
  OrganizationSelector: () => "org-selector"
}));
vi.mock("../_lib/admin-api", () => ({
  getAuthMe: vi.fn(async () => ({
    authenticated: true,
    organizations: [{ id: "org1", name: "Org 1", role: "owner" }]
  })),
  getAdminEvents: vi.fn(async () => [{ id: "e1", title: "Team", startsAt: "", status: "published", capacity: 20 }]),
  getStats: vi.fn(async () => ({ registeredCount: 1, checkedInCount: 1, waitlistCount: 2, noShowRate: 0 }))
}));

import StatsPage from "./page";

describe("StatsPage", () => {
  it("renders stats", async () => {
    const html = renderToStaticMarkup(await StatsPage({
      searchParams: Promise.resolve({ organizationId: "org1", eventId: "e1" })
    } as any));
    expect(html).toContain("org-selector");
    expect(html).toContain("selector");
    expect(html).toContain("Registered: 1");
    expect(html).toContain("Waitlist: 2");
  });
});
