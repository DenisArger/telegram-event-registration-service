import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertTelegramUser(
  db: SupabaseClient,
  payload: {
    telegramId: number;
    fullName: string;
    username: string | null;
  }
): Promise<string> {
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
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}
