import { describe, expect, it, vi } from "vitest";
import { handleStart } from "./start";

describe("handleStart", () => {
  it("sends welcome message", async () => {
    const reply = vi.fn(async () => undefined);

    await handleStart({ reply } as any);

    expect(reply).toHaveBeenCalledOnce();
    expect(reply).toHaveBeenCalledWith(expect.stringContaining("Welcome"));
  });
});
