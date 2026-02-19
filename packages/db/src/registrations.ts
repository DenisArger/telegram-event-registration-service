import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CancelRegistrationResult,
  EventRegistrationQuestion,
  RegisterForEventResult,
  RegistrationQuestionAnswer
} from "@event/shared";

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

export async function saveAnswersAndRegister(
  db: SupabaseClient,
  eventId: string,
  userId: string,
  answers: Array<{ questionId: string; answerText?: string | null; isSkipped?: boolean }>
): Promise<RegisterForEventResult> {
  const payload = answers.map((item) => ({
    questionId: item.questionId,
    answerText: item.answerText ?? null,
    isSkipped: item.isSkipped ?? false
  }));

  const { data, error } = await db.rpc("save_registration_answers_and_register", {
    p_event_id: eventId,
    p_user_id: userId,
    p_answers: payload
  });

  if (error) throw error;
  return data as RegisterForEventResult;
}

export async function getRegistrationQuestions(
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

export async function getExistingRegistrationStatus(
  db: SupabaseClient,
  eventId: string,
  userId: string
): Promise<RegisterForEventResult | null> {
  const { count: registeredCount, error: regError } = await db
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "registered");

  if (regError) throw regError;
  if ((registeredCount ?? 0) > 0) return { status: "already_registered" };

  const { count: waitlistCount, error: waitError } = await db
    .from("waitlist")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (waitError) throw waitError;
  if ((waitlistCount ?? 0) > 0) return { status: "already_waitlisted" };

  return null;
}

export async function getOrCreateQuestionSession(
  db: SupabaseClient,
  eventId: string,
  userId: string,
  ttlMinutes = 30
): Promise<{ currentIndex: number; answers: RegistrationQuestionAnswer[]; expiresAt: string; isExpired: boolean }> {
  const nowIso = new Date().toISOString();

  const { data: existing, error: existingError } = await db
    .from("registration_question_sessions")
    .select("id,current_index,answers_json,expires_at,status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const isExpired = new Date(String(existing.expires_at)).getTime() <= Date.now();

    if (isExpired) {
      const { error: expireError } = await db
        .from("registration_question_sessions")
        .update({ status: "cancelled", updated_at: nowIso })
        .eq("id", existing.id);

      if (expireError) throw expireError;
    } else {
      return {
        currentIndex: Number(existing.current_index),
        answers: ((existing.answers_json as any[]) ?? []) as RegistrationQuestionAnswer[],
        expiresAt: String(existing.expires_at),
        isExpired: false
      };
    }
  }

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("registration_question_sessions")
    .insert({
      event_id: eventId,
      user_id: userId,
      current_index: 1,
      answers_json: [],
      status: "active",
      expires_at: expiresAt,
      updated_at: nowIso
    })
    .select("current_index,answers_json,expires_at")
    .single();

  if (error) throw error;

  return {
    currentIndex: Number(data.current_index),
    answers: ((data.answers_json as any[]) ?? []) as RegistrationQuestionAnswer[],
    expiresAt: String(data.expires_at),
    isExpired: false
  };
}

export async function getActiveQuestionSession(
  db: SupabaseClient,
  userId: string
): Promise<{
  eventId: string;
  currentIndex: number;
  answers: RegistrationQuestionAnswer[];
  expiresAt: string;
  isExpired: boolean;
} | null> {
  const { data, error } = await db
    .from("registration_question_sessions")
    .select("event_id,current_index,answers_json,expires_at,status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const isExpired = new Date(String(data.expires_at)).getTime() <= Date.now();
  return {
    eventId: String(data.event_id),
    currentIndex: Number(data.current_index),
    answers: ((data.answers_json as any[]) ?? []) as RegistrationQuestionAnswer[],
    expiresAt: String(data.expires_at),
    isExpired
  };
}

export async function advanceQuestionSession(
  db: SupabaseClient,
  eventId: string,
  userId: string,
  nextIndex: number,
  answers: RegistrationQuestionAnswer[],
  ttlMinutes = 30
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const { error } = await db
    .from("registration_question_sessions")
    .update({
      current_index: nextIndex,
      answers_json: answers,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw error;
}

export async function cancelQuestionSession(
  db: SupabaseClient,
  eventId: string,
  userId: string
): Promise<void> {
  const { error } = await db
    .from("registration_question_sessions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString()
    })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw error;
}

export async function completeQuestionSession(
  db: SupabaseClient,
  eventId: string,
  userId: string
): Promise<void> {
  const { error } = await db.rpc("clear_active_question_session", {
    p_event_id: eventId,
    p_user_id: userId
  });

  if (error) throw error;
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
