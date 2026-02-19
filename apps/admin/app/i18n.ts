export type UiLocale = "en" | "ru";

export function getUiLocale(): UiLocale {
  return process.env.NEXT_PUBLIC_LOCALE === "ru" ? "ru" : "en";
}

const dict = {
  en: {
    title: "Event Registration Admin",
    subtitle: "Initial scaffold for internal events operations.",
    system_status: "System Status",
    bot_health: "Bot API health",
    events: "Events",
    no_events: "No events available or admin API is not configured.",
    attendees: "Attendees",
    no_attendees: "No attendees yet.",
    attendees_need_event: "Selecting attendees requires at least one event.",
    stats: "Stats",
    stats_unavailable: "Stats are unavailable.",
    registered: "Registered",
    checked_in: "Checked in",
    waitlist: "Waitlist",
    no_show_rate: "No-show rate",
    waitlist_empty: "Waitlist is empty.",
    no_event_selected: "No event selected.",
    checkin: "Check-in",
    checked_in_mark: "checked in ✅",
    event_for: "for"
  },
  ru: {
    title: "Админка регистрации на мероприятия",
    subtitle: "Базовая панель для управления внутренними мероприятиями.",
    system_status: "Состояние системы",
    bot_health: "Состояние Bot API",
    events: "Мероприятия",
    no_events: "События не найдены или Admin API не настроен.",
    attendees: "Участники",
    no_attendees: "Пока нет участников.",
    attendees_need_event: "Для просмотра участников нужно хотя бы одно мероприятие.",
    stats: "Статистика",
    stats_unavailable: "Статистика недоступна.",
    registered: "Зарегистрировано",
    checked_in: "Чекин",
    waitlist: "Лист ожидания",
    no_show_rate: "Доля no-show",
    waitlist_empty: "Лист ожидания пуст.",
    no_event_selected: "Мероприятие не выбрано.",
    checkin: "Чекин",
    checked_in_mark: "отмечен ✅",
    event_for: "для"
  }
} as const;

export function ui(key: keyof typeof dict.en, locale = getUiLocale()): string {
  return dict[locale][key] ?? dict.en[key];
}
