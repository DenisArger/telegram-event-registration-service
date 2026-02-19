import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../create-event-form", () => ({
  CreateEventForm: () => "create-form"
}));
vi.mock("../publish-button", () => ({
  PublishButton: () => "publish"
}));
vi.mock("../close-button", () => ({
  CloseButton: () => "close"
}));
vi.mock("../event-questions-editor", () => ({
  EventQuestionsEditor: () => "editor"
}));
vi.mock("../_lib/admin-api", () => ({
  getAdminEvents: vi.fn(async () => [{ id: "e1", title: "Team", startsAt: "2026-03-01T10:00:00Z", status: "published", capacity: 20 }])
}));

import EventsPage from "./page";

describe("EventsPage", () => {
  it("renders events and editors", async () => {
    const html = renderToStaticMarkup(await EventsPage());
    expect(html).toContain("Team");
    expect(html).toContain("create-form");
    expect(html).toContain("editor");
  });
});
