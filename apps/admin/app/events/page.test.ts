import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getAdminEvents } from "../_lib/admin-api";

vi.mock("../_lib/admin-api", () => ({
  getAuthMe: vi.fn(async () => ({
    authenticated: true,
    organizations: [{ id: "org1", name: "Org 1", role: "owner" }]
  })),
  getAdminEvents: vi.fn(async () => [
    { id: "e1", title: "Team", description: "Sync", startsAt: "2026-03-01T10:00:00Z", status: "published", capacity: 20 }
  ])
}));
vi.mock("../_components/organization-selector", () => ({
  OrganizationSelector: () => "org-selector"
}));
vi.mock("./events-manager", () => ({
  EventsManager: ({ organizationId, events }: { organizationId?: string; events: Array<{ id: string }> }) =>
    `events-manager:${organizationId ?? ""}:${events.map((item) => item.id).join(",")}`
}));

import EventsPage from "./page";

describe("EventsPage", () => {
  it("renders brief list and links to event edit pages", async () => {
    const html = renderToStaticMarkup(await EventsPage({ searchParams: Promise.resolve({ organizationId: "org1" }) }));
    expect(html).toContain("events-manager:org1:e1");
    expect(html).toContain("/events/new?organizationId=org1");
  });

  it("renders no events message when list is empty", async () => {
    vi.mocked(getAdminEvents).mockResolvedValueOnce([]);
    const html = renderToStaticMarkup(await EventsPage({ searchParams: Promise.resolve({ organizationId: "org1" }) }));
    expect(html).toContain("events-manager:org1:");
  });

  it("renders endsAt and capacity without startsAt", async () => {
    vi.mocked(getAdminEvents).mockResolvedValueOnce([
      {
        id: "e2",
        title: "Afterparty",
        description: null,
        startsAt: null,
        endsAt: "2026-03-01T11:00:00Z",
        status: "draft",
        capacity: 0
      }
    ] as any);

    const html = renderToStaticMarkup(await EventsPage({ searchParams: Promise.resolve({ organizationId: "org1" }) }));
    expect(html).toContain("events-manager:org1:e2");
  });
});
