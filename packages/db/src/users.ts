import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@event/shared";

export interface TelegramUserRecord {
  id: string;
  role: UserRole;
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
