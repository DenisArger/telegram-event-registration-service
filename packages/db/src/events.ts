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

export async function createEvent(
  db: SupabaseClient,
  payload: {
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: string;
    capacity: number;
    createdBy: string;
  }
): Promise<EventEntity> {
  const { data, error } = await db
    .from("events")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      location: payload.location ?? null,
      starts_at: payload.startsAt,
      capacity: payload.capacity,
      status: "draft",
      created_by: payload.createdBy
    })
    .select("id,title,description,starts_at,capacity,status")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    startsAt: data.starts_at,
    capacity: data.capacity,
    status: data.status
  };
}
