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

export function buildEventMessageHtml(event: EventEntity, locale: BotLocale = "en"): string {
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";
  const descriptionHtml = event.description ? markdownToTelegramHtml(event.description) : null;

  return [
    `📅 <b>${escapeHtml(event.title)}</b>`,
    `🕒 ${escapeHtml(new Date(event.startsAt).toLocaleString(dateLocale))}`,
    event.endsAt ? `🏁 ${escapeHtml(new Date(event.endsAt).toLocaleString(dateLocale))}` : null,
    `👥 ${escapeHtml(t(locale, "capacity_label"))}: ${event.capacity}`,
    descriptionHtml ? `📝 ${descriptionHtml}` : null
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
