import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  generateAnnouncementWithAi: vi.fn(),
  logError: vi.fn()
}));

vi.mock("../../../src/aiDraft", () => ({
  generateAnnouncementWithAi: mocks.generateAnnouncementWithAi
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return { ...actual, logError: mocks.logError };
});

describe("POST /api/admin/ai-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
  });

  it("returns 405 for unsupported method", async () => {
    const { default: handler } = await import("../../../api/admin/ai-draft");
    const res = createRes();
    await handler({ method: "GET", headers: {}, body: {} } as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 for non-admin request", async () => {
    const { default: handler } = await import("../../../api/admin/ai-draft");
    const res = createRes();
    await handler({ method: "POST", headers: {}, body: { title: "A" } } as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const { default: handler } = await import("../../../api/admin/ai-draft");
    const res = createRes();
    await handler(
      { method: "POST", headers: { "x-admin-email": "admin@example.com" }, body: {} } as any,
      res as any
    );
    expect(res.statusCode).toBe(400);
  });

  it("returns generated draft", async () => {
    mocks.generateAnnouncementWithAi.mockResolvedValueOnce({
      text: "Draft",
      provider: "openai",
      model: "gpt-4o-mini"
    });
    const { default: handler } = await import("../../../api/admin/ai-draft");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { title: "Event", description: "Desc", locale: "ru", tone: "friendly" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      draft: "Draft",
      provider: "openai",
      model: "gpt-4o-mini"
    });
  });

  it("maps provider/config errors to 502", async () => {
    mocks.generateAnnouncementWithAi.mockRejectedValueOnce(new Error("missing_ai_api_key"));
    const { default: handler } = await import("../../../api/admin/ai-draft");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-admin-email": "admin@example.com" },
        body: { title: "Event" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(502);
    expect(res.payload).toEqual({ message: "missing_ai_api_key" });
  });
});
