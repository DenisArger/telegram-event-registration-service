import { describe, expect, it } from "vitest";
import handler from "../../api/health";
import { createRes } from "./testUtils";

describe("GET /api/health", () => {
  it("returns ok status", () => {
    const res = createRes();
    handler({} as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ status: "ok" });
  });
});
