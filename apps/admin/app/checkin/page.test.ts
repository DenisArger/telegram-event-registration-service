import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_components/event-selector", () => ({
  EventSelector: () => "selector"
}));
vi.mock("../checkin-form", () => ({
  CheckInForm: ({ initialEventId }: { initialEventId?: string }) => `checkin:${initialEventId ?? ""}`
}));
vi.mock("../_lib/admin-api", () => ({
  getAdminEvents: vi.fn(async () => [{ id: "e1", title: "Team", startsAt: "", status: "published", capacity: 20 }])
}));

import CheckinPage from "./page";

describe("CheckinPage", () => {
  it("passes selected event id to form", async () => {
    const html = renderToStaticMarkup(await CheckinPage({ searchParams: { eventId: "e1" } } as any));
    expect(html).toContain("selector");
    expect(html).toContain("checkin:e1");
  });
});
