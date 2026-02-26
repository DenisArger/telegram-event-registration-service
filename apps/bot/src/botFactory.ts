import { Telegraf } from "telegraf";
import { bot as defaultBot } from "./runtime.js";

const botCache = new Map<string, Telegraf<any>>();

export function getBotForToken(token: string): Telegraf<any> {
  const normalized = String(token).trim();
  if (!normalized) {
    return defaultBot;
  }

  const defaultToken = String(process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (normalized === defaultToken) {
    return defaultBot;
  }

  const cached = botCache.get(normalized);
  if (cached) return cached;

  const bot = new Telegraf(normalized);
  bot.use(defaultBot.middleware());
  botCache.set(normalized, bot);
  return bot;
}
