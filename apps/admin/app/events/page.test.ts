import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_lib/admin-api", () => ({
  getAdminEvents: vi.fn(async () => [
    { id: "e1", title: "Team", description: "Sync", startsAt: "2026-03-01T10:00:00Z", status: "published", capacity: 20 }
  ])
}));

import EventsPage from "./page";

describe("EventsPage", () => {
  it("renders brief list and links to event edit pages", async () => {
    const html = renderToStaticMarkup(await EventsPage());
    expect(html).toContain("Team");
    expect(html).toContain("Sync");
    expect(html).toContain("/events/e1");
  });
});
