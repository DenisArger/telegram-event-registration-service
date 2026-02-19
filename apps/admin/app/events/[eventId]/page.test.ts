import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../_lib/admin-api", () => ({
  getAdminEventById: vi.fn(async () => ({
    id: "e1",
    title: "Team",
    description: null,
    location: null,
    startsAt: "2026-03-01T10:00:00Z",
    endsAt: "2026-03-01T11:00:00Z",
    status: "published",
    capacity: 20
  }))
}));
vi.mock("../event-editor", () => ({
  EventEditor: () => "event-editor"
}));

import EventDetailsPage from "./page";

describe("EventDetailsPage", () => {
  it("renders event editor for selected event", async () => {
    const html = renderToStaticMarkup(await EventDetailsPage({ params: Promise.resolve({ eventId: "e1" }) } as any));
    expect(html).toContain("Team");
    expect(html).toContain("event-editor");
  });
});
