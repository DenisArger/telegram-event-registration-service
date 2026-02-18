import { Markup, Telegraf } from "telegraf";
import {
  cancelRegistration,
  createServiceClient,
  listPublishedEvents,
  registerForEvent,
  upsertTelegramUser
} from "@event/db";
import { loadEnv, logError, logInfo } from "@event/shared";
import { handleStart } from "./handlers/start";
import { buildEventMessage, registrationStatusToText } from "./messages";

const env = loadEnv(process.env);
const db = createServiceClient(process.env);

export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

bot.start(async (ctx) => {
  try {
    await handleStart(ctx);
  } catch (error) {
    logError("start_command_failed", { error });
    await ctx.reply("Unexpected error. Please try again.");
  }
});

bot.command("events", async (ctx) => {
  try {
    const events = await listPublishedEvents(db);

    if (events.length === 0) {
      await ctx.reply("No published events right now.");
      return;
    }

    for (const event of events) {
      const message = buildEventMessage(event);

      await ctx.reply(
        message,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Register", `reg:${event.id}`),
            Markup.button.callback("Cancel", `cancel:${event.id}`)
          ]
        ])
      );
    }
  } catch (error) {
    logError("events_command_failed", { error });
    await ctx.reply("Could not load events now. Try again later.");
  }
});

bot.action(/^reg:(.+)$/, async (ctx) => {
  try {
    const eventId = ctx.match[1];
    const from = ctx.from;

    if (!from) {
      await ctx.answerCbQuery("User info not available.");
      return;
    }

    const userId = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    const result = await registerForEvent(db, eventId, userId);
    await ctx.answerCbQuery(registrationStatusToText(result), { show_alert: true });
  } catch (error) {
    logError("register_action_failed", { error });
    await ctx.answerCbQuery("Registration failed. Try again later.", { show_alert: true });
  }
});

bot.action(/^cancel:(.+)$/, async (ctx) => {
  try {
    const eventId = ctx.match[1];
    const from = ctx.from;

    if (!from) {
      await ctx.answerCbQuery("User info not available.");
      return;
    }

    const userId = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    const result = await cancelRegistration(db, eventId, userId);
    const text =
      result.status === "cancelled"
        ? "Your registration has been cancelled."
        : "You were not registered for this event.";

    await ctx.answerCbQuery(text, { show_alert: true });
  } catch (error) {
    logError("cancel_action_failed", { error });
    await ctx.answerCbQuery("Cancellation failed. Try again later.", { show_alert: true });
  }
});

logInfo("bot_initialized");
