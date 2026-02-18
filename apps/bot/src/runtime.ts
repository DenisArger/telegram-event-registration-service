import { Markup, Telegraf } from "telegraf";
import {
  cancelRegistration,
  createServiceClient,
  createEvent,
  getEventById,
  closeEvent,
  listPublishedEvents,
  publishEvent,
  registerForEvent,
  upsertTelegramUser
} from "@event/db";
import { loadEnv, logError, logInfo } from "@event/shared";
import { handleStart } from "./handlers/start";
import { buildEventMessage, registrationStatusToText } from "./messages";
import {
  canManageEvents,
  parseCreateEventCommand,
  validateLifecycleTransition
} from "./organizer";

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

bot.command("create_event", async (ctx) => {
  try {
    const from = ctx.from;
    const text = "text" in (ctx.message ?? {}) ? ctx.message.text : "";

    if (!from) {
      await ctx.reply("User info not available.");
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    if (!canManageEvents(user.role)) {
      await ctx.reply("Access denied. Organizer or admin role required.");
      return;
    }

    const input = parseCreateEventCommand(text);
    const event = await createEvent(db, {
      title: input.title,
      startsAt: input.startsAt,
      capacity: input.capacity,
      description: input.description,
      createdBy: user.id
    });

    await ctx.reply(
      `Draft event created:\n${buildEventMessage(event)}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Publish", `pub:${event.id}`),
          Markup.button.callback("Close", `cls:${event.id}`)
        ]
      ])
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (
      message === "invalid_format" ||
      message === "title_required" ||
      message === "starts_at_required" ||
      message === "capacity_required" ||
      message === "capacity_invalid" ||
      message === "starts_at_invalid"
    ) {
      await ctx.reply(
        "Usage:\n/create_event Title | 2026-03-01T10:00:00Z | 30 | Optional description"
      );
      return;
    }
    logError("create_event_command_failed", { error });
    await ctx.reply("Could not create event now.");
  }
});

bot.command("publish_event", async (ctx) => {
  await handleOrganizerLifecycleCommand(ctx, "published");
});

bot.command("close_event", async (ctx) => {
  await handleOrganizerLifecycleCommand(ctx, "closed");
});

bot.action(/^reg:(.+)$/, async (ctx) => {
  try {
    const eventId = ctx.match[1];
    const from = ctx.from;

    if (!from) {
      await ctx.answerCbQuery("User info not available.");
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    const result = await registerForEvent(db, eventId, user.id);
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

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    const result = await cancelRegistration(db, eventId, user.id);
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

bot.action(/^pub:(.+)$/, async (ctx) => {
  await handleOrganizerLifecycleAction(ctx, "published");
});

bot.action(/^cls:(.+)$/, async (ctx) => {
  await handleOrganizerLifecycleAction(ctx, "closed");
});

async function handleOrganizerLifecycleCommand(
  ctx: any,
  target: "published" | "closed"
): Promise<void> {
  try {
    const from = ctx.from;
    const text = "text" in (ctx.message ?? {}) ? ctx.message.text : "";
    const eventId = text.replace(/^\/(publish_event|close_event)\s+/i, "").trim();

    if (!from || !eventId) {
      await ctx.reply(`Usage: /${target === "published" ? "publish_event" : "close_event"} <event_id>`);
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    if (!canManageEvents(user.role)) {
      await ctx.reply("Access denied. Organizer or admin role required.");
      return;
    }

    const current = await getEventById(db, eventId);
    if (!current) {
      await ctx.reply("Event not found.");
      return;
    }

    if (!validateLifecycleTransition(current.status, target)) {
      await ctx.reply(`Invalid transition: ${current.status} -> ${target}`);
      return;
    }

    const updated = target === "published" ? await publishEvent(db, eventId) : await closeEvent(db, eventId);
    if (!updated) {
      await ctx.reply("Event state was not updated.");
      return;
    }

    await ctx.reply(`Event updated to ${updated.status}: ${updated.title}`);
  } catch (error) {
    logError("organizer_lifecycle_command_failed", { error });
    await ctx.reply("Could not update event now.");
  }
}

async function handleOrganizerLifecycleAction(
  ctx: any,
  target: "published" | "closed"
): Promise<void> {
  try {
    const from = ctx.from;
    const eventId = ctx.match[1];

    if (!from || !eventId) {
      await ctx.answerCbQuery("Invalid action.", { show_alert: true });
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    if (!canManageEvents(user.role)) {
      await ctx.answerCbQuery("Organizer/admin role required.", { show_alert: true });
      return;
    }

    const current = await getEventById(db, eventId);
    if (!current || !validateLifecycleTransition(current.status, target)) {
      await ctx.answerCbQuery("Invalid event state transition.", { show_alert: true });
      return;
    }

    const updated = target === "published" ? await publishEvent(db, eventId) : await closeEvent(db, eventId);
    if (!updated) {
      await ctx.answerCbQuery("Event update failed.", { show_alert: true });
      return;
    }

    await ctx.answerCbQuery(`Event is now ${updated.status}.`, { show_alert: true });
  } catch (error) {
    logError("organizer_lifecycle_action_failed", { error });
    await ctx.answerCbQuery("Could not update event.", { show_alert: true });
  }
}

logInfo("bot_initialized");
