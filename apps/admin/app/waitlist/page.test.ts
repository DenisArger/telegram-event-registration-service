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
  getWaitlist: vi.fn(async () => [{ userId: "u2", fullName: "Jane", username: null, position: 1 }])
}));

import WaitlistPage from "./page";

describe("WaitlistPage", () => {
  it("renders waitlist", async () => {
    const html = renderToStaticMarkup(await WaitlistPage({
      searchParams: Promise.resolve({ organizationId: "org1", eventId: "e1" })
    } as any));
    expect(html).toContain("org-selector");
    expect(html).toContain("selector");
    expect(html).toContain("#1 Jane");
  });
});
