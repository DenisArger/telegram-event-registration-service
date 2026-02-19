import { describe, expect, it } from "vitest";
import { resolveSelectedEventId } from "./event-selection";

describe("resolveSelectedEventId", () => {
  const events = [
    { id: "e1", title: "A", startsAt: "", status: "published", capacity: 10 },
    { id: "e2", title: "B", startsAt: "", status: "published", capacity: 10 }
  ] as any;

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
