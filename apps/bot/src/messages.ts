import type { EventEntity, RegisterForEventResult } from "@event/shared";
import type { BotLocale } from "./i18n.js";
import { t } from "./i18n.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdownToHtml(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*]+)\*/g, "<i>$1</i>");
}

function markdownToTelegramHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  return lines
    .map((rawLine) => {
      const line = escapeHtml(rawLine.trim());
      if (!line) return "";
      if (line.startsWith("### ")) return `<b>${inlineMarkdownToHtml(line.slice(4))}</b>`;
      if (line.startsWith("## ")) return `<b>${inlineMarkdownToHtml(line.slice(3))}</b>`;
      if (line.startsWith("# ")) return `<b>${inlineMarkdownToHtml(line.slice(2))}</b>`;
      if (line.startsWith("- ")) return `• ${inlineMarkdownToHtml(line.slice(2))}`;
      return inlineMarkdownToHtml(line);
    })
    .join("\n");
}

function formatEventDate(value: string | null | undefined, locale: BotLocale): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";
  return date.toLocaleString(dateLocale);
}

function formatCapacity(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return String(value);
}

export function buildEventMessage(event: EventEntity, locale: BotLocale = "en"): string {
  const startsAt = formatEventDate(event.startsAt, locale);
  const endsAt = formatEventDate(event.endsAt, locale);
  const capacity = formatCapacity(event.capacity);

  return [
    event.title,
    startsAt ? `🕒 ${startsAt}` : null,
    endsAt ? `🏁 ${endsAt}` : null,
    capacity ? `👥 ${t(locale, "capacity_label")}: ${capacity}` : null,
    event.description ? event.description : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildEventMessageHtml(event: EventEntity, locale: BotLocale = "en"): string {
  const titleHtml = inlineMarkdownToHtml(escapeHtml(event.title));
  const startsAt = formatEventDate(event.startsAt, locale);
  const endsAt = formatEventDate(event.endsAt, locale);
  const capacity = formatCapacity(event.capacity);
  const descriptionHtml = event.description ? markdownToTelegramHtml(event.description) : null;

  return [
    titleHtml,
    startsAt ? `🕒 ${escapeHtml(startsAt)}` : null,
    endsAt ? `🏁 ${escapeHtml(endsAt)}` : null,
    capacity ? `👥 ${escapeHtml(t(locale, "capacity_label"))}: ${capacity}` : null,
    descriptionHtml ? descriptionHtml : null
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
