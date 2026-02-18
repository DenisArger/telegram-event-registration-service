import { describe, expect, it } from "vitest";
import {
  canManageEvents,
  parseCreateEventCommand,
  validateLifecycleTransition
} from "./organizer";

describe("canManageEvents", () => {
  it("allows organizer/admin", () => {
    expect(canManageEvents("organizer")).toBe(true);
    expect(canManageEvents("admin")).toBe(true);
  });

  it("denies participant", () => {
    expect(canManageEvents("participant")).toBe(false);
  });
});

describe("parseCreateEventCommand", () => {
  it("parses valid command", () => {
    const result = parseCreateEventCommand(
      "/create_event Team Sync | 2026-03-01T10:00:00Z | 20 | Weekly internal meeting"
    );

    expect(result.title).toBe("Team Sync");
    expect(result.capacity).toBe(20);
    expect(result.description).toContain("Weekly");
  });

  it("throws on invalid capacity", () => {
    expect(() =>
      parseCreateEventCommand("/create_event Team Sync | 2026-03-01T10:00:00Z | zero")
    ).toThrow("capacity_invalid");
  });
});

describe("validateLifecycleTransition", () => {
  it("accepts draft -> published and published -> closed", () => {
    expect(validateLifecycleTransition("draft", "published")).toBe(true);
    expect(validateLifecycleTransition("published", "closed")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(validateLifecycleTransition("published", "published")).toBe(false);
    expect(validateLifecycleTransition("draft", "closed")).toBe(false);
    expect(validateLifecycleTransition("closed", "published")).toBe(false);
  });
});
