import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventEntity } from "@event/shared";

export async function listPublishedEvents(db: SupabaseClient): Promise<EventEntity[]> {
  const { data, error } = await db
    .from("events")
    .select("id,title,description,starts_at,capacity,status")
    .eq("status", "published")
    .order("starts_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    capacity: row.capacity,
    status: row.status
  }));
}
