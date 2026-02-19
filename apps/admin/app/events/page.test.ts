import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./events-page-content", () => ({
  EventsPageContent: () => "events-content"
}));
vi.mock("../_lib/admin-api", () => ({
  getAdminEvents: vi.fn(async () => [{ id: "e1", title: "Team", startsAt: "2026-03-01T10:00:00Z", status: "published", capacity: 20 }])
}));

import EventsPage from "./page";

describe("EventsPage", () => {
  it("renders page shell and content component", async () => {
    const html = renderToStaticMarkup(await EventsPage());
    expect(html).toContain("Events");
    expect(html).toContain("events-content");
  });
});
