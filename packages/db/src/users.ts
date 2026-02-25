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

export interface UserByAuthRecord {
  id: string;
  role: UserRole;
  authUserId: string | null;
  email: string | null;
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

function mapUserByAuthRecord(data: Record<string, unknown>): UserByAuthRecord {
  return {
    id: data.id as string,
    role: data.role as UserRole,
    authUserId: (data.auth_user_id as string | null) ?? null,
    email: (data.email as string | null) ?? null
  };
}

export async function getUserByAuthUserId(
  db: SupabaseClient,
  authUserId: string
): Promise<UserByAuthRecord | null> {
  const { data, error } = await db
    .from("users")
    .select("id,role,auth_user_id,email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapUserByAuthRecord(data as Record<string, unknown>);
}

export async function getUserByEmail(
  db: SupabaseClient,
  email: string
): Promise<UserByAuthRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await db
    .from("users")
    .select("id,role,auth_user_id,email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapUserByAuthRecord(data as Record<string, unknown>);
}

export async function linkUserToAuthUser(
  db: SupabaseClient,
  payload: { userId: string; authUserId: string; email?: string | null }
): Promise<UserByAuthRecord> {
  const email = payload.email == null ? null : payload.email.trim().toLowerCase();
  const { data, error } = await db
    .from("users")
    .update({
      auth_user_id: payload.authUserId,
      email
    })
    .eq("id", payload.userId)
    .select("id,role,auth_user_id,email")
    .single();

  if (error) throw error;
  return mapUserByAuthRecord(data as Record<string, unknown>);
}
