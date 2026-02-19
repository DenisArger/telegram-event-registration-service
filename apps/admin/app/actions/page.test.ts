import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../_components/event-selector", () => ({
  EventSelector: () => "selector"
}));
vi.mock("../promote-button", () => ({
  PromoteButton: ({ eventId }: { eventId: string }) => `promote:${eventId}`
}));
vi.mock("../export-button", () => ({
  ExportButton: ({ eventId }: { eventId: string }) => `export:${eventId}`
}));
vi.mock("../_lib/admin-api", () => ({
  getAdminEvents: vi.fn(async () => [{ id: "e1", title: "Team", startsAt: "", status: "published", capacity: 20 }])
}));

import ActionsPage from "./page";

describe("ActionsPage", () => {
  it("renders actions for selected event", async () => {
    const html = renderToStaticMarkup(await ActionsPage({ searchParams: { eventId: "e1" } } as any));
    expect(html).toContain("selector");
    expect(html).toContain("promote:e1");
    expect(html).toContain("export:e1");
  });
});
