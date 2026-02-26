import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EventRegistrationQuestion,
  EventAttendeeEntity,
  EventEntity,
  EventStatsEntity,
  WaitlistEntryEntity
} from "@event/shared";

function mapEventRow(row: any): EventEntity {
  return {
    id: row.id,
    ...(row.organization_id ? { organizationId: row.organization_id } : {}),
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    registrationSuccessMessage: row.registration_success_message,
    status: row.status
  };
}

export async function listPublishedEvents(db: SupabaseClient): Promise<EventEntity[]> {
  const { data, error } = await db
    .from("events")
    .select("id,organization_id,title,description,starts_at,ends_at,capacity,registration_success_message,status")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("starts_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => mapEventRow(row));
}

export async function createEvent(
  db: SupabaseClient,
  payload: {
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    capacity?: number | null;
    registrationSuccessMessage?: string | null;
    organizationId?: string | null;
    createdBy: string;
  }
): Promise<EventEntity> {
  const { data, error } = await db
    .from("events")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      location: payload.location ?? null,
      starts_at: payload.startsAt ?? null,
      ends_at: payload.endsAt ?? null,
      capacity: payload.capacity ?? null,
      registration_success_message: payload.registrationSuccessMessage ?? null,
      organization_id: payload.organizationId ?? null,
      status: "draft",
      created_by: payload.createdBy
    })
    .select("id,organization_id,title,description,starts_at,ends_at,capacity,registration_success_message,status")
    .single();

  if (error) throw error;

  return mapEventRow(data);
}

export async function getEventById(
  db: SupabaseClient,
  eventId: string
): Promise<EventEntity | null> {
  const { data, error } = await db
    .from("events")
    .select("id,organization_id,title,description,starts_at,ends_at,capacity,registration_success_message,status")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapEventRow(data);
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
    .is("deleted_at", null)
    .select("id,organization_id,title,description,starts_at,ends_at,capacity,registration_success_message,status")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapEventRow(data);
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
    .is("deleted_at", null)
    .select("id,organization_id,title,description,starts_at,ends_at,capacity,registration_success_message,status")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapEventRow(data);
}

export async function listAllEvents(db: SupabaseClient, organizationId?: string): Promise<EventEntity[]> {
  const query = db
    .from("events")
    .select("id,organization_id,title,description,starts_at,ends_at,capacity,registration_success_message,status")
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });

  const { data, error } = organizationId
    ? await query.eq("organization_id", organizationId)
    : await query;

  if (error) throw error;

  return (data ?? []).map((row) => mapEventRow(row));
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

  const { data: attendeeOrder, error: attendeeOrderError } = await db
    .from("event_attendee_order")
    .select("user_id,display_order,row_color")
    .eq("event_id", eventId);

  if (attendeeOrderError) throw attendeeOrderError;
  const attendeeMetaByUserId = new Map<string, { displayOrder: number; rowColor: string | null }>();
  for (const row of attendeeOrder ?? []) {
    attendeeMetaByUserId.set(String((row as any).user_id), {
      displayOrder: Number((row as any).display_order),
      rowColor: (row as any).row_color ?? null
    });
  }

  const { data: checkins, error: checkinsError } = await db
    .from("checkins")
    .select("user_id")
    .eq("event_id", eventId);

  if (checkinsError) throw checkinsError;
  const checkedInIds = new Set((checkins ?? []).map((row: any) => String(row.user_id)));

  const { data: answers, error: answersError } = await db
    .from("registration_question_answers")
    .select(
      `
      user_id,
      question_id,
      question_version,
      answer_text,
      is_skipped,
      created_at,
      event_registration_questions!inner(
        prompt
      )
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (answersError) throw answersError;

  const answersByUser = new Map<string, EventAttendeeEntity["answers"]>();
  for (const row of answers ?? []) {
    const key = String((row as any).user_id);
    const list = answersByUser.get(key) ?? [];
    list.push({
      questionId: String((row as any).question_id),
      questionVersion: Number((row as any).question_version),
      prompt: String((row as any).event_registration_questions.prompt),
      answerText: (row as any).answer_text,
      isSkipped: Boolean((row as any).is_skipped),
      createdAt: String((row as any).created_at)
    });
    answersByUser.set(key, list);
  }

  return (data ?? [])
    .map((row: any) => ({
      userId: row.user_id,
      fullName: row.users.full_name,
      username: row.users.username,
      telegramId: row.users.telegram_id,
      displayOrder: attendeeMetaByUserId.get(String(row.user_id))?.displayOrder ?? null,
      rowColor: attendeeMetaByUserId.get(String(row.user_id))?.rowColor ?? null,
      status: row.status,
      paymentStatus: row.payment_status,
      registeredAt: row.created_at,
      checkedIn: checkedInIds.has(String(row.user_id)),
      answers: answersByUser.get(String(row.user_id)) ?? []
    }))
    .sort((left, right) => {
      if (left.displayOrder !== null && right.displayOrder !== null) {
        return left.displayOrder - right.displayOrder;
      }
      if (left.displayOrder !== null) return -1;
      if (right.displayOrder !== null) return 1;
      return new Date(left.registeredAt).getTime() - new Date(right.registeredAt).getTime();
    });
}

export async function saveEventAttendeeOrder(
  db: SupabaseClient,
  eventId: string,
  orderedUserIds: string[]
): Promise<void> {
  const { error } = await db.rpc("upsert_event_attendee_order", {
    p_event_id: eventId,
    p_user_ids: orderedUserIds
  });

  if (error) throw error;
}

export async function saveEventAttendeeRowColor(
  db: SupabaseClient,
  eventId: string,
  userId: string,
  rowColor: string | null
): Promise<void> {
  const { error } = await db.rpc("upsert_event_attendee_row_color", {
    p_event_id: eventId,
    p_user_id: userId,
    p_row_color: rowColor
  });

  if (error) throw error;
}

export async function listEventWaitlist(
  db: SupabaseClient,
  eventId: string
): Promise<WaitlistEntryEntity[]> {
  const { data, error } = await db
    .from("waitlist")
    .select(
      `
      user_id,
      position,
      created_at,
      users!inner(
        full_name,
        username,
        telegram_id
      )
    `
    )
    .eq("event_id", eventId)
    .order("position", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    fullName: row.users.full_name,
    username: row.users.username,
    telegramId: row.users.telegram_id,
    position: row.position,
    createdAt: row.created_at
  }));
}

export function calculateNoShowRate(registeredCount: number, checkedInCount: number): number {
  if (registeredCount <= 0) return 0;
  const value = ((registeredCount - checkedInCount) / registeredCount) * 100;
  return Number(Math.max(0, value).toFixed(2));
}

export async function getEventStats(
  db: SupabaseClient,
  eventId: string
): Promise<EventStatsEntity> {
  const [{ count: registeredCount, error: regError }, { count: checkedInCount, error: checkError }, { count: waitlistCount, error: waitError }] =
    await Promise.all([
      db
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "registered"),
      db
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId),
      db
        .from("waitlist")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
    ]);

  if (regError) throw regError;
  if (checkError) throw checkError;
  if (waitError) throw waitError;

  const reg = registeredCount ?? 0;
  const chk = checkedInCount ?? 0;
  const wait = waitlistCount ?? 0;

  return {
    eventId,
    registeredCount: reg,
    checkedInCount: chk,
    waitlistCount: wait,
    noShowRate: calculateNoShowRate(reg, chk)
  };
}

export async function promoteNextFromWaitlist(
  db: SupabaseClient,
  eventId: string
): Promise<{ status: "promoted" | "empty_waitlist"; user_id?: string }> {
  const { data, error } = await db.rpc("promote_next_waitlist", {
    p_event_id: eventId
  });

  if (error) throw error;
  return data as { status: "promoted" | "empty_waitlist"; user_id?: string };
}

export async function listEventQuestions(
  db: SupabaseClient,
  eventId: string
): Promise<EventRegistrationQuestion[]> {
  const { data, error } = await db.rpc("list_active_event_questions", {
    p_event_id: eventId
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    version: row.version,
    prompt: row.prompt,
    isRequired: row.is_required,
    position: row.position,
    isActive: row.is_active
  }));
}

export async function upsertEventQuestions(
  db: SupabaseClient,
  eventId: string,
  questions: Array<{ id?: string; prompt: string; isRequired: boolean; position: number }>
): Promise<EventRegistrationQuestion[]> {
  const payload = questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    isRequired: question.isRequired,
    position: question.position
  }));

  const { data, error } = await db.rpc("upsert_event_questions", {
    p_event_id: eventId,
    p_questions: payload
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    version: row.version,
    prompt: row.prompt,
    isRequired: row.is_required,
    position: row.position,
    isActive: row.is_active
  }));
}
