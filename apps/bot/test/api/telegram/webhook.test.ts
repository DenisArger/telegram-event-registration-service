import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRes, setRequiredEnv } from "../testUtils";

const mocks = vi.hoisted(() => ({
  getBotForToken: vi.fn(),
  getOrganizationTelegramBotTokenEncrypted: vi.fn(),
  handleUpdate: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@event/db", () => ({
  createServiceClient: vi.fn(() => ({})),
  getOrganizationTelegramBotTokenEncrypted: mocks.getOrganizationTelegramBotTokenEncrypted
}));

vi.mock("../../../src/botFactory.js", () => ({
  getBotForToken: mocks.getBotForToken
}));

vi.mock("@event/shared", async () => {
  const actual = await vi.importActual<typeof import("@event/shared")>("@event/shared");
  return {
    ...actual,
    logError: mocks.logError
  };
});

describe("POST /api/telegram/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRequiredEnv();
    mocks.getBotForToken.mockReturnValue({
      handleUpdate: mocks.handleUpdate
    });
  });

  it("rejects invalid method", async () => {
    const { default: handler } = await import("../../../api/telegram/webhook");
    const res = createRes();

    await handler({ method: "GET", headers: {} } as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("rejects invalid secret", async () => {
    const { default: handler } = await import("../../../api/telegram/webhook");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "bad" }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(401);
  });

  it("processes update", async () => {
    const { default: handler } = await import("../../../api/telegram/webhook");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "secret" },
        body: { update_id: 1 }
      } as any,
      res as any
    );

    expect(mocks.handleUpdate).toHaveBeenCalledWith({ update_id: 1 });
    expect(mocks.getBotForToken).toHaveBeenCalledWith("token");
    expect(res.statusCode).toBe(200);
  });

  it("uses organization bot token when organizationId is provided", async () => {
    const { encryptSecret } = await import("../../../src/crypto");
    process.env.TOKEN_ENCRYPTION_KEY = "test-token-encryption-key";
    mocks.getOrganizationTelegramBotTokenEncrypted.mockResolvedValueOnce(
      encryptSecret("org-token", process.env)
    );
    const { default: handler } = await import("../../../api/telegram/webhook");
    const res = createRes();

    await handler(
      {
        method: "POST",
        query: { organizationId: "org1" },
        headers: { "x-telegram-bot-api-secret-token": "secret" },
        body: { update_id: 2 }
      } as any,
      res as any
    );

    expect(mocks.getOrganizationTelegramBotTokenEncrypted).toHaveBeenCalledWith({}, "org1");
    expect(mocks.getBotForToken).toHaveBeenCalledWith("org-token");
    expect(res.statusCode).toBe(200);
  });

  it("returns 500 when bot fails", async () => {
    mocks.handleUpdate.mockRejectedValueOnce(new Error("boom"));
    const { default: handler } = await import("../../../api/telegram/webhook");
    const res = createRes();

    await handler(
      {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "secret" },
        body: { update_id: 1 }
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
