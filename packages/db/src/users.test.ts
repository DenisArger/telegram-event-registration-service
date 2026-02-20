import { describe, expect, it, vi } from "vitest";
import { getUserByTelegramId, upsertTelegramUser } from "./users";

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

  it("loads user by telegram id", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { id: "u2", role: "admin", telegram_id: 42 },
      error: null
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const db = { from } as any;

    const result = await getUserByTelegramId(db, 42);

    expect(result).toEqual({ id: "u2", role: "admin", telegramId: 42 });
  });

  it("returns null when user by telegram id is missing", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const db = { from } as any;

    const result = await getUserByTelegramId(db, 7);
    expect(result).toBeNull();
  });
});
