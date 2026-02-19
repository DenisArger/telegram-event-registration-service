import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_components/event-selector", () => ({
  EventSelector: () => "selector"
}));
vi.mock("../_lib/admin-api", () => ({
  getAdminEvents: vi.fn(async () => [{ id: "e1", title: "Team", startsAt: "", status: "published", capacity: 20 }]),
  getAttendees: vi.fn(async () => [
    {
      userId: "u1",
      fullName: "John",
      username: "john",
      status: "registered",
      checkedIn: true,
      answers: [{ questionId: "q1", questionVersion: 1, prompt: "Why?", answerText: "Because", isSkipped: false, createdAt: "2026" }]
    }
  ])
}));

import AttendeesPage from "./page";

describe("AttendeesPage", () => {
  it("renders selected attendees with answers", async () => {
    const html = renderToStaticMarkup(await AttendeesPage({ searchParams: { eventId: "e1" } } as any));
    expect(html).toContain("selector");
    expect(html).toContain("John");
    expect(html).toContain("Why?: Because");
  });
});
