import { describe, expect, it } from "vitest";
import { datetimeLocalToIso, isoToDatetimeLocal } from "./datetime";

describe("datetime helpers", () => {
  it("isoToDatetimeLocal returns empty for invalid values", () => {
    expect(isoToDatetimeLocal()).toBe("");
    expect(isoToDatetimeLocal(null)).toBe("");
    expect(isoToDatetimeLocal("bad")).toBe("");
  });

  it("isoToDatetimeLocal formats valid ISO", () => {
    const out = isoToDatetimeLocal("2026-02-19T10:30:00.000Z");
    expect(out).toMatch(/^2026-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("datetimeLocalToIso validates and converts", () => {
    expect(datetimeLocalToIso("   ")).toBeNull();
    expect(datetimeLocalToIso("not-a-date")).toBeNull();
    expect(datetimeLocalToIso("2026-02-19T10:30")).toContain("2026-02-19T");
  });
});
