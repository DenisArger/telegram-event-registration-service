import { describe, expect, it } from "vitest";
import { resolveSelectedEventId, resolveSelectedOrganizationId } from "./event-selection";

describe("resolveSelectedEventId", () => {
  const events = [
    { id: "e1", title: "A", startsAt: "", status: "published" as const, capacity: 10 },
    { id: "e2", title: "B", startsAt: "", status: "published" as const, capacity: 10 }
  ];

  it("returns null for empty events", () => {
    expect(resolveSelectedEventId(undefined, [])).toBeNull();
  });

  it("returns query event id when valid", () => {
    expect(resolveSelectedEventId({ eventId: "e2" }, events)).toBe("e2");
  });

  it("falls back to first event", () => {
    expect(resolveSelectedEventId({ eventId: "missing" }, events)).toBe("e1");
  });
});

describe("resolveSelectedOrganizationId", () => {
  const organizations = [
    { id: "o1", name: "Org A", role: "owner" as const },
    { id: "o2", name: "Org B", role: "admin" as const }
  ];

  it("returns null for empty organizations", () => {
    expect(resolveSelectedOrganizationId(undefined, [])).toBeNull();
  });

  it("returns query organization id when valid", () => {
    expect(resolveSelectedOrganizationId({ organizationId: "o2" }, organizations)).toBe("o2");
  });

  it("falls back to first organization", () => {
    expect(resolveSelectedOrganizationId({ organizationId: "missing" }, organizations)).toBe("o1");
  });
});
