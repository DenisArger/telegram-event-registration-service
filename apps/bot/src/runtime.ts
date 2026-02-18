import { Telegraf } from "telegraf";
import { createServiceClient, listPublishedEvents } from "@event/db";
import { loadEnv, logError, logInfo } from "@event/shared";
import { handleStart } from "./handlers/start";

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

    const message = events
      .map((event) => `• ${event.title} (${new Date(event.startsAt).toLocaleString()})`)
      .join("\n");

    await ctx.reply(`Available events:\n${message}`);
  } catch (error) {
    logError("events_command_failed", { error });
    await ctx.reply("Could not load events now. Try again later.");
  }
});

logInfo("bot_initialized");
