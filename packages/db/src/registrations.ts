import type { SupabaseClient } from "@supabase/supabase-js";
import type { CancelRegistrationResult, RegisterForEventResult } from "@event/shared";

export async function registerForEvent(
  db: SupabaseClient,
  eventId: string,
  userId: string
): Promise<RegisterForEventResult> {
  const { data, error } = await db.rpc("register_for_event", {
    p_event_id: eventId,
    p_user_id: userId
  });

  if (error) throw error;
  return data as RegisterForEventResult;
}

export async function cancelRegistration(
  db: SupabaseClient,
  eventId: string,
  userId: string
): Promise<CancelRegistrationResult> {
  const { data, error } = await db.rpc("cancel_registration", {
    p_event_id: eventId,
    p_user_id: userId
  });

  if (error) throw error;
  return data as CancelRegistrationResult;
}
