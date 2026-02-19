import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./create-event-form", () => ({
  CreateEventForm: () => null
}));

vi.mock("./close-button", () => ({
  CloseButton: () => null
}));
vi.mock("./event-questions-editor", () => ({
  EventQuestionsEditor: () => null
}));

import HomePage from "./page";

describe("HomePage", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders fallback state without admin env", async () => {
    delete process.env.ADMIN_API_BASE_URL;
    delete process.env.ADMIN_REQUEST_EMAIL;
    delete process.env.NEXT_PUBLIC_BOT_HEALTH_URL;

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("unknown");
    expect(html).toContain("No events available");
    expect(html).toContain("Stats are unavailable");
  });

  it("renders loaded data", async () => {
    process.env.NEXT_PUBLIC_BOT_HEALTH_URL = "https://bot.example/health";
    process.env.ADMIN_API_BASE_URL = "https://bot.example";
    process.env.ADMIN_REQUEST_EMAIL = "admin@example.com";

    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ events: [{ id: "e1", title: "Team", startsAt: "2026-03-01T10:00:00Z", status: "published", capacity: 20 }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ attendees: [{ userId: "u1", fullName: "John", username: "john", status: "registered", checkedIn: true }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ waitlist: [{ userId: "u2", fullName: "Jane", username: null, position: 1 }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ stats: { registeredCount: 1, checkedInCount: 1, waitlistCount: 1, noShowRate: 0 } }) });

    vi.stubGlobal("fetch", fetch);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Bot API health: ok");
    expect(html).toContain("Team");
    expect(html).toContain("John");
    expect(html).toContain("No-show rate: 0%");
  });
});
