import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventAttendeeEntity, EventEntity } from "@event/shared";

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

export async function getEventById(
  db: SupabaseClient,
  eventId: string
): Promise<EventEntity | null> {
  const { data, error } = await db
    .from("events")
    .select("id,title,description,starts_at,capacity,status")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    startsAt: data.starts_at,
    capacity: data.capacity,
    status: data.status
  };
}

export async function publishEvent(
  db: SupabaseClient,
  eventId: string
): Promise<EventEntity | null> {
  const { data, error } = await db
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId)
    .eq("status", "draft")
    .select("id,title,description,starts_at,capacity,status")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    startsAt: data.starts_at,
    capacity: data.capacity,
    status: data.status
  };
}

export async function closeEvent(
  db: SupabaseClient,
  eventId: string
): Promise<EventEntity | null> {
  const { data, error } = await db
    .from("events")
    .update({ status: "closed" })
    .eq("id", eventId)
    .eq("status", "published")
    .select("id,title,description,starts_at,capacity,status")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    startsAt: data.starts_at,
    capacity: data.capacity,
    status: data.status
  };
}

export async function listAllEvents(db: SupabaseClient): Promise<EventEntity[]> {
  const { data, error } = await db
    .from("events")
    .select("id,title,description,starts_at,capacity,status")
    .order("starts_at", { ascending: false });

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

export async function listEventAttendees(
  db: SupabaseClient,
  eventId: string
): Promise<EventAttendeeEntity[]> {
  const { data, error } = await db
    .from("registrations")
    .select(
      `
      user_id,
      status,
      payment_status,
      created_at,
      users!inner(
        full_name,
        username,
        telegram_id
      )
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    fullName: row.users.full_name,
    username: row.users.username,
    telegramId: row.users.telegram_id,
    status: row.status,
    paymentStatus: row.payment_status,
    registeredAt: row.created_at
  }));
}
