import type { SupabaseClient } from "@supabase/supabase-js";

export async function markCheckIn(
  db: SupabaseClient,
  payload: {
    eventId: string;
    userId: string;
    method?: "manual" | "qr";
  }
): Promise<{ status: "checked_in" | "already_checked_in" }> {
  const method = payload.method ?? "manual";

  const { data: reg, error: regError } = await db
    .from("registrations")
    .select("status")
    .eq("event_id", payload.eventId)
    .eq("user_id", payload.userId)
    .maybeSingle();

  if (regError) throw regError;
  if (!reg || reg.status !== "registered") {
    throw new Error("registration_not_active");
  }

  const { data: existing, error: existingError } = await db
    .from("checkins")
    .select("id")
    .eq("event_id", payload.eventId)
    .eq("user_id", payload.userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    return { status: "already_checked_in" };
  }

  const { error } = await db.from("checkins").insert({
    event_id: payload.eventId,
    user_id: payload.userId,
    method
  });

  if (error) throw error;
  return { status: "checked_in" };
}
