import { describe, expect, it } from "vitest";
import * as db from "./index";

describe("db index exports", () => {
  it("re-exports data access functions", () => {
    expect(typeof db.createServiceClient).toBe("function");
    expect(typeof db.listPublishedEvents).toBe("function");
    expect(typeof db.registerForEvent).toBe("function");
    expect(typeof db.upsertTelegramUser).toBe("function");
    expect(typeof db.markCheckIn).toBe("function");
  });
});
