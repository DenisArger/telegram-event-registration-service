import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_components/event-selector", () => ({
  EventSelector: () => "selector"
}));
vi.mock("../_components/organization-selector", () => ({
  OrganizationSelector: () => "org-selector"
}));
vi.mock("./attendees-table", () => ({
  AttendeesTable: () => "attendees-table"
}));
vi.mock("../_lib/admin-api", () => ({
  getAuthMe: vi.fn(async () => ({
    authenticated: true,
    organizations: [{ id: "org1", name: "Org 1", role: "owner" }]
  })),
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
    },
    {
      userId: "u2",
      fullName: "Jane",
      username: "jane",
      displayOrder: 2,
      rowColor: null,
      status: "cancelled",
      registeredAt: "2026-02-19T11:00:00Z",
      checkedIn: false,
      answers: []
    }
  ])
}));

import AttendeesPage from "./page";

describe("AttendeesPage", () => {
  it("renders table mode by default", async () => {
    const html = renderToStaticMarkup(await AttendeesPage({
      searchParams: Promise.resolve({ organizationId: "org1", eventId: "e1" })
    } as any));
    expect(html).toContain("org-selector");
    expect(html).toContain("selector");
    expect(html).toContain("attendees-table");
    expect(html).toContain("Table");
    expect(html).toContain("Attendees: 1");
    expect(html).toContain("Active");
  });

  it("renders list mode with attendee summary", async () => {
    const html = renderToStaticMarkup(await AttendeesPage({
      searchParams: Promise.resolve({ organizationId: "org1", eventId: "e1", view: "list" })
    } as any));
    expect(html).toContain("List");
    expect(html).toContain("John");
    expect(html).toContain("@john");
    expect(html).toContain("checked in");
    expect(html).toContain("Attendees: 1");
  });

  it("renders cancelled tab as read-only list", async () => {
    const html = renderToStaticMarkup(await AttendeesPage({
      searchParams: Promise.resolve({ organizationId: "org1", eventId: "e1", status: "cancelled" })
    } as any));
    expect(html).toContain("Cancelled");
    expect(html).toContain("Jane");
    expect(html).toContain("Cancelled: 1");
  });
});
