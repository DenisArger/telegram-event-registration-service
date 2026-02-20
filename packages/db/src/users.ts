import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@event/shared";

export interface TelegramUserRecord {
  id: string;
  role: UserRole;
}

export interface UserByTelegramRecord {
  id: string;
  role: UserRole;
  telegramId: number;
}

export async function upsertTelegramUser(
  db: SupabaseClient,
  payload: {
    telegramId: number;
    fullName: string;
    username: string | null;
  }
): Promise<TelegramUserRecord> {
  const { data, error } = await db
    .from("users")
    .upsert(
      {
        telegram_id: payload.telegramId,
        full_name: payload.fullName,
        username: payload.username
      },
      { onConflict: "telegram_id" }
    )
    .select("id,role")
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    role: data.role as UserRole
  };
}

export async function getUserByTelegramId(
  db: SupabaseClient,
  telegramId: number
): Promise<UserByTelegramRecord | null> {
  const { data, error } = await db
    .from("users")
    .select("id,role,telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id as string,
    role: data.role as UserRole,
    telegramId: Number(data.telegram_id)
  };
}
