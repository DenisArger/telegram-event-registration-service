import type { EventEntity, RegisterForEventResult } from "@event/shared";
import type { BotLocale } from "./i18n.js";
import { t } from "./i18n.js";

export function buildEventMessage(event: EventEntity, locale: BotLocale = "en"): string {
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";
  return [
    `📅 ${event.title}`,
    `🕒 ${new Date(event.startsAt).toLocaleString(dateLocale)}`,
    event.endsAt ? `🏁 ${new Date(event.endsAt).toLocaleString(dateLocale)}` : null,
    `👥 ${t(locale, "capacity_label")}: ${event.capacity}`,
    event.description ? `📝 ${event.description}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function registrationStatusToText(
  result: RegisterForEventResult,
  locale: BotLocale = "en"
): string {
  if (result.status === "registered") {
    return t(locale, "status_registered");
  }
  if (result.status === "waitlisted") {
    return t(locale, "status_waitlisted", { position: result.position });
  }
  if (result.status === "already_registered") {
    return t(locale, "status_already_registered");
  }
  return t(locale, "status_already_waitlisted");
}
