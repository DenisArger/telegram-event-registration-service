import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_components/event-selector", () => ({
  EventSelector: () => "selector"
}));
vi.mock("./attendees-table", () => ({
  AttendeesTable: () => "attendees-table"
}));
vi.mock("../_lib/admin-api", () => ({
  getAdminEvents: vi.fn(async () => [{ id: "e1", title: "Team", startsAt: "", status: "published", capacity: 20 }]),
  getAttendees: vi.fn(async () => [
    {
      userId: "u1",
      fullName: "John",
      username: "john",
      displayOrder: 1,
      rowColor: null,
      status: "registered",
      registeredAt: "2026-02-19T10:00:00Z",
      checkedIn: true,
      answers: [{ questionId: "q1", questionVersion: 1, prompt: "Why?", answerText: "Because", isSkipped: false, createdAt: "2026" }]
    }
  ])
}));

import AttendeesPage from "./page";

describe("AttendeesPage", () => {
  it("renders table mode by default", async () => {
    const html = renderToStaticMarkup(await AttendeesPage({ searchParams: { eventId: "e1" } } as any));
    expect(html).toContain("selector");
    expect(html).toContain("attendees-table");
    expect(html).toContain("Table");
  });

  it("renders list mode with attendee answers", async () => {
    const html = renderToStaticMarkup(await AttendeesPage({ searchParams: { eventId: "e1", view: "list" } } as any));
    expect(html).toContain("List");
    expect(html).toContain("John");
    expect(html).toContain("Why?: Because");
  });
});
