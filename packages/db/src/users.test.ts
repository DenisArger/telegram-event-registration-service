import { describe, expect, it, vi } from "vitest";
import { upsertTelegramUser } from "./users";

describe("upsertTelegramUser", () => {
  it("upserts user and maps id/role", async () => {
    const single = vi.fn(async () => ({ data: { id: "u1", role: "organizer" }, error: null }));
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ upsert }));
    const db = { from } as any;

    const result = await upsertTelegramUser(db, {
      telegramId: 1,
      fullName: "John Doe",
      username: "john"
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        telegram_id: 1,
        full_name: "John Doe",
        username: "john"
      },
      { onConflict: "telegram_id" }
    );
    expect(result).toEqual({ id: "u1", role: "organizer" });
  });

  it("throws when upsert fails", async () => {
    const single = vi.fn(async () => ({ data: null, error: new Error("boom") }));
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ upsert }));
    const db = { from } as any;

    await expect(
      upsertTelegramUser(db, { telegramId: 1, fullName: "John Doe", username: null })
    ).rejects.toThrow("boom");
  });
});
