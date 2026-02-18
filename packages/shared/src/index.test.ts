import { describe, expect, it } from "vitest";
import * as shared from "./index";

describe("shared index exports", () => {
  it("re-exports public modules", () => {
    expect(typeof shared.loadEnv).toBe("function");
    expect(typeof shared.logInfo).toBe("function");
    expect(typeof shared.logError).toBe("function");
  });
});
