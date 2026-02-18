import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  loadEnv: vi.fn()
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient
}));

vi.mock("@event/shared", () => ({
  loadEnv: mocks.loadEnv
}));

describe("createServiceClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadEnv.mockReturnValue({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service"
    });
    mocks.createClient.mockReturnValue({ ok: true });
  });

  it("creates supabase service client from parsed env", async () => {
    const { createServiceClient } = await import("./client");

    const result = createServiceClient({ SUPABASE_URL: "ignored" });

    expect(mocks.loadEnv).toHaveBeenCalled();
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service"
    );
    expect(result).toEqual({ ok: true });
  });
});
