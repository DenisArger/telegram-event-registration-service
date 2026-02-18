import { describe, expect, it, vi } from "vitest";
import { handleStart } from "./start";

describe("handleStart", () => {
  it("sends welcome message", async () => {
    const reply = vi.fn(async () => undefined);

    await handleStart({ reply } as any);

    expect(reply).toHaveBeenCalledOnce();
    expect(String(reply.mock.calls[0][0])).toContain("Welcome");
  });
});
