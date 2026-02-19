export type BotLocale = "en" | "ru";

export function resolveLocale(languageCode?: string): BotLocale {
  if (!languageCode) return "en";
  return languageCode.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function getLocaleFromCtx(ctx: any): BotLocale {
  return resolveLocale(ctx?.from?.language_code);
}

type Vars = Record<string, string | number | undefined>;
type Messages = Record<string, string | ((vars?: Vars) => string)>;

const translations: Record<BotLocale, Messages> = {
  en: {
    start_welcome: "Welcome to Event Registration Bot. Use /events to see available events.",
    unexpected_error: "Unexpected error. Please try again.",
    no_events: "No published events right now.",
    register_btn: "Register",
    cancel_btn: "Cancel",
    events_load_failed: "Could not load events now. Try again later.",
    user_info_unavailable: "User info not available.",
    access_denied: "Access denied. Organizer or admin role required.",
    draft_created: (v) => `Draft event created:\n${String(v?.eventMessage ?? "")}`,
    publish_btn: "Publish",
    close_btn: "Close",
    create_event_usage: "Usage:\n/create_event Title | 2026-03-01T10:00:00Z | 30 | Optional description",
    create_event_failed: "Could not create event now.",
    registration_failed: "Registration failed. Try again later.",
    registration_cancelled: "Your registration has been cancelled.",
    cancel_confirm_prompt: "Cancel registration for this event?",
    cancel_confirm_btn: "Yes, cancel",
    cancel_keep_btn: "Keep registration",
    cancel_kept: "Registration kept.",
    not_registered: "You were not registered for this event.",
    cancellation_failed: "Cancellation failed. Try again later.",
    lifecycle_usage: (v) => `Usage: /${String(v?.command ?? "publish_event")} <event_id>`,
    event_not_found: "Event not found.",
    invalid_transition: (v) => `Invalid transition: ${String(v?.fromStatus)} -> ${String(v?.toStatus)}`,
    event_not_updated: "Event state was not updated.",
    event_updated: (v) => `Event updated to ${String(v?.status)}: ${String(v?.title)}`,
    event_update_failed: "Could not update event now.",
    invalid_action: "Invalid action.",
    organizer_required: "Organizer/admin role required.",
    invalid_state_transition: "Invalid event state transition.",
    action_event_update_failed: "Event update failed.",
    action_event_updated: (v) => `Event is now ${String(v?.status)}.`,
    action_update_failed: "Could not update event.",
    status_registered: "You are registered ✅",
    status_waitlisted: (v) => `Event is full. Added to waitlist (#${String(v?.position ?? "?")})`,
    status_already_registered: "You are already registered.",
    status_already_waitlisted: "You are already in waitlist.",
    capacity_label: "Capacity",
    question_prompt: (v) => `Question ${String(v?.index ?? 1)}/${String(v?.total ?? 1)}:\n${String(v?.prompt ?? "")}`,
    question_optional_hint: "Optional question. You can skip.",
    question_required_hint: "This question is required.",
    question_skip_btn: "Skip",
    question_cancel_btn: "Cancel",
    question_cancel_confirm_prompt: "Cancel questionnaire? Your answers for this session will be lost.",
    question_cancelled: "Questionnaire cancelled.",
    question_invalid_required: "Answer is required.",
    question_too_long: "Answer is too long (max 500 chars).",
    question_expired: "Questionnaire session expired. Please tap Register again.",
    question_collect_failed: "Could not save your answers."
  },
  ru: {
    start_welcome: "Добро пожаловать в бот регистрации на мероприятия. Используйте /events для просмотра событий.",
    unexpected_error: "Произошла ошибка. Попробуйте еще раз.",
    no_events: "Сейчас нет опубликованных мероприятий.",
    register_btn: "Зарегистрироваться",
    cancel_btn: "Отменить регистрацию",
    events_load_failed: "Не удалось загрузить мероприятия. Попробуйте позже.",
    user_info_unavailable: "Не удалось получить данные пользователя.",
    access_denied: "Доступ запрещен. Нужна роль организатора или администратора.",
    draft_created: (v) => `Черновик мероприятия создан:\n${String(v?.eventMessage ?? "")}`,
    publish_btn: "Опубликовать",
    close_btn: "Закрыть",
    create_event_usage: "Формат:\n/create_event Название | 2026-03-01T10:00:00Z | 30 | Описание",
    create_event_failed: "Не удалось создать мероприятие.",
    registration_failed: "Не удалось записаться. Попробуйте позже.",
    registration_cancelled: "Ваша регистрация отменена.",
    cancel_confirm_prompt: "Отменить регистрацию на это мероприятие?",
    cancel_confirm_btn: "Да, отменить",
    cancel_keep_btn: "Оставить регистрацию",
    cancel_kept: "Регистрация сохранена.",
    not_registered: "Вы не были зарегистрированы на это мероприятие.",
    cancellation_failed: "Не удалось отменить регистрацию. Попробуйте позже.",
    lifecycle_usage: (v) => `Формат: /${String(v?.command ?? "publish_event")} <event_id>`,
    event_not_found: "Мероприятие не найдено.",
    invalid_transition: (v) => `Недопустимый переход: ${String(v?.fromStatus)} -> ${String(v?.toStatus)}`,
    event_not_updated: "Состояние мероприятия не обновлено.",
    event_updated: (v) => `Мероприятие обновлено: ${String(v?.status)} (${String(v?.title)})`,
    event_update_failed: "Не удалось обновить мероприятие.",
    invalid_action: "Некорректное действие.",
    organizer_required: "Нужна роль организатора/админа.",
    invalid_state_transition: "Недопустимый переход состояния мероприятия.",
    action_event_update_failed: "Не удалось обновить мероприятие.",
    action_event_updated: (v) => `Статус мероприятия: ${String(v?.status)}.`,
    action_update_failed: "Не удалось обновить мероприятие.",
    status_registered: "Вы успешно зарегистрированы ✅",
    status_waitlisted: (v) => `Мест нет. Вы добавлены в лист ожидания (#${String(v?.position ?? "?")})`,
    status_already_registered: "Вы уже зарегистрированы.",
    status_already_waitlisted: "Вы уже в листе ожидания.",
    capacity_label: "Вместимость",
    question_prompt: (v) => `Вопрос ${String(v?.index ?? 1)}/${String(v?.total ?? 1)}:\n${String(v?.prompt ?? "")}`,
    question_optional_hint: "Необязательный вопрос. Можно пропустить.",
    question_required_hint: "Обязательный вопрос.",
    question_skip_btn: "Пропустить",
    question_cancel_btn: "Отменить",
    question_cancel_confirm_prompt: "Отменить анкету? Ответы этой сессии будут потеряны.",
    question_cancelled: "Анкета отменена.",
    question_invalid_required: "Нужен ответ на вопрос.",
    question_too_long: "Ответ слишком длинный (максимум 500 символов).",
    question_expired: "Сессия анкеты истекла. Нажмите «Записаться» снова.",
    question_collect_failed: "Не удалось сохранить ответы."
  }
};

export function t(locale: BotLocale, key: string, vars?: Vars): string {
  const value = translations[locale][key] ?? translations.en[key];
  if (typeof value === "function") return value(vars);
  return value ?? key;
}
