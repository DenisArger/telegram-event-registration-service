import { describe, expect, it } from "vitest";
import { calculateNoShowRate } from "./events";

describe("calculateNoShowRate", () => {
  it("returns 0 when registered is 0", () => {
    expect(calculateNoShowRate(0, 0)).toBe(0);
  });

  it("calculates no-show rate as percent", () => {
    expect(calculateNoShowRate(10, 7)).toBe(30);
    expect(calculateNoShowRate(3, 1)).toBe(66.67);
  });

  it("never returns negative values", () => {
    expect(calculateNoShowRate(5, 9)).toBe(0);
  });
});
