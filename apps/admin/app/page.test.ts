import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "./page";

describe("Dashboard page", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders fallback health when health url is missing", async () => {
    delete process.env.NEXT_PUBLIC_BOT_HEALTH_URL;
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Dashboard");
    expect(html).toContain("unknown");
    expect(html).toContain("/events");
  });

  it("renders ok health from endpoint", async () => {
    process.env.NEXT_PUBLIC_BOT_HEALTH_URL = "https://bot.example/health";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true }));

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Bot API health");
    expect(html).toContain(">ok<");
    expect(html).toContain("/actions");
  });
});
