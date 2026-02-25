import { describe, expect, it, vi } from "vitest";
import {
  getUserByAuthUserId,
  getUserByEmail,
  getUserByTelegramId,
  linkUserToAuthUser,
  upsertTelegramUser
} from "./users";

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

  it("loads user by auth user id", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { id: "u3", role: "organizer", auth_user_id: "a1", email: "admin@example.com" },
      error: null
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const db = { from } as any;

    const result = await getUserByAuthUserId(db, "a1");

    expect(result).toEqual({
      id: "u3",
      role: "organizer",
      authUserId: "a1",
      email: "admin@example.com"
    });
  });

  it("normalizes email when searching user by email", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { id: "u4", role: "admin", auth_user_id: "a2", email: "owner@example.com" },
      error: null
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const db = { from } as any;

    const result = await getUserByEmail(db, "  Owner@Example.com  ");

    expect(eq).toHaveBeenCalledWith("email", "owner@example.com");
    expect(result).toEqual({
      id: "u4",
      role: "admin",
      authUserId: "a2",
      email: "owner@example.com"
    });
  });

  it("returns null for empty email search", async () => {
    const from = vi.fn();
    const db = { from } as any;

    const result = await getUserByEmail(db, "   ");
    expect(result).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("links user to auth user id with normalized email", async () => {
    const single = vi.fn(async () => ({
      data: { id: "u5", role: "admin", auth_user_id: "a5", email: "ops@example.com" },
      error: null
    }));
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const db = { from } as any;

    const result = await linkUserToAuthUser(db, {
      userId: "u5",
      authUserId: "a5",
      email: "  Ops@Example.com "
    });

    expect(update).toHaveBeenCalledWith({
      auth_user_id: "a5",
      email: "ops@example.com"
    });
    expect(eq).toHaveBeenCalledWith("id", "u5");
    expect(result).toEqual({
      id: "u5",
      role: "admin",
      authUserId: "a5",
      email: "ops@example.com"
    });
  });
});
