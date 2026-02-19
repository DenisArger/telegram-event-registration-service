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
import { handleStart } from "./handlers/start.js";
import { buildEventMessage, registrationStatusToText } from "./messages.js";
import { getLocaleFromCtx, t } from "./i18n.js";
import {
  canManageEvents,
  parseCreateEventCommand,
  validateLifecycleTransition
} from "./organizer.js";

const env = loadEnv(process.env);
const db = createServiceClient(process.env);

export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

bot.start(async (ctx) => {
  try {
    await handleStart(ctx);
  } catch (error) {
    const locale = getLocaleFromCtx(ctx);
    logError("start_command_failed", { error });
    await ctx.reply(t(locale, "unexpected_error"));
  }
});

bot.command("events", async (ctx) => {
  const locale = getLocaleFromCtx(ctx);
  try {
    const events = await listPublishedEvents(db);

    if (events.length === 0) {
      await ctx.reply(t(locale, "no_events"));
      return;
    }

    for (const event of events) {
      const message = buildEventMessage(event, locale);

      await ctx.reply(
        message,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(t(locale, "register_btn"), `reg:${event.id}`),
            Markup.button.callback(t(locale, "cancel_btn"), `cancel:${event.id}`)
          ]
        ])
      );
    }
  } catch (error) {
    logError("events_command_failed", { error });
    await ctx.reply(t(locale, "events_load_failed"));
  }
});

bot.command("create_event", async (ctx) => {
  const locale = getLocaleFromCtx(ctx);
  try {
    const from = ctx.from;
    const text = "text" in (ctx.message ?? {}) ? ctx.message.text : "";

    if (!from) {
      await ctx.reply(t(locale, "user_info_unavailable"));
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    if (!canManageEvents(user.role)) {
      await ctx.reply(t(locale, "access_denied"));
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
      t(locale, "draft_created", { eventMessage: buildEventMessage(event, locale) }),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(t(locale, "publish_btn"), `pub:${event.id}`),
          Markup.button.callback(t(locale, "close_btn"), `cls:${event.id}`)
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
        t(locale, "create_event_usage")
      );
      return;
    }
    logError("create_event_command_failed", { error });
    await ctx.reply(t(locale, "create_event_failed"));
  }
});

bot.command("publish_event", async (ctx) => {
  await handleOrganizerLifecycleCommand(ctx, "published");
});

bot.command("close_event", async (ctx) => {
  await handleOrganizerLifecycleCommand(ctx, "closed");
});

bot.action(/^reg:(.+)$/, async (ctx) => {
  const locale = getLocaleFromCtx(ctx);
  try {
    const eventId = ctx.match[1];
    const from = ctx.from;

    if (!from || !eventId) {
      await ctx.answerCbQuery(t(locale, "user_info_unavailable"));
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    const result = await registerForEvent(db, eventId, user.id);
    await ctx.answerCbQuery(registrationStatusToText(result, locale), { show_alert: true });
  } catch (error) {
    logError("register_action_failed", { error });
    await ctx.answerCbQuery(t(locale, "registration_failed"), { show_alert: true });
  }
});

bot.action(/^cancel:(.+)$/, async (ctx) => {
  const locale = getLocaleFromCtx(ctx);
  try {
    const eventId = ctx.match[1];
    const from = ctx.from;

    if (!from || !eventId) {
      await ctx.answerCbQuery(t(locale, "user_info_unavailable"));
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
        ? t(locale, "registration_cancelled")
        : t(locale, "not_registered");

    await ctx.answerCbQuery(text, { show_alert: true });
  } catch (error) {
    logError("cancel_action_failed", { error });
    await ctx.answerCbQuery(t(locale, "cancellation_failed"), { show_alert: true });
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
  const locale = getLocaleFromCtx(ctx);
  try {
    const from = ctx.from;
    const text = "text" in (ctx.message ?? {}) ? ctx.message.text : "";
    const eventId = text.replace(/^\/(publish_event|close_event)\s+/i, "").trim();

    if (!from || !eventId) {
      await ctx.reply(
        t(locale, "lifecycle_usage", {
          command: target === "published" ? "publish_event" : "close_event"
        })
      );
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    if (!canManageEvents(user.role)) {
      await ctx.reply(t(locale, "access_denied"));
      return;
    }

    const current = await getEventById(db, eventId);
    if (!current) {
      await ctx.reply(t(locale, "event_not_found"));
      return;
    }

    if (!validateLifecycleTransition(current.status, target)) {
      await ctx.reply(t(locale, "invalid_transition", { fromStatus: current.status, toStatus: target }));
      return;
    }

    const updated = target === "published" ? await publishEvent(db, eventId) : await closeEvent(db, eventId);
    if (!updated) {
      await ctx.reply(t(locale, "event_not_updated"));
      return;
    }

    await ctx.reply(t(locale, "event_updated", { status: updated.status, title: updated.title }));
  } catch (error) {
    logError("organizer_lifecycle_command_failed", { error });
    await ctx.reply(t(locale, "event_update_failed"));
  }
}

async function handleOrganizerLifecycleAction(
  ctx: any,
  target: "published" | "closed"
): Promise<void> {
  const locale = getLocaleFromCtx(ctx);
  try {
    const from = ctx.from;
    const eventId = ctx.match[1];

    if (!from || !eventId) {
      await ctx.answerCbQuery(t(locale, "invalid_action"), { show_alert: true });
      return;
    }

    const user = await upsertTelegramUser(db, {
      telegramId: from.id,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
      username: from.username ?? null
    });

    if (!canManageEvents(user.role)) {
      await ctx.answerCbQuery(t(locale, "organizer_required"), { show_alert: true });
      return;
    }

    const current = await getEventById(db, eventId);
    if (!current || !validateLifecycleTransition(current.status, target)) {
      await ctx.answerCbQuery(t(locale, "invalid_state_transition"), { show_alert: true });
      return;
    }

    const updated = target === "published" ? await publishEvent(db, eventId) : await closeEvent(db, eventId);
    if (!updated) {
      await ctx.answerCbQuery(t(locale, "action_event_update_failed"), { show_alert: true });
      return;
    }

    await ctx.answerCbQuery(t(locale, "action_event_updated", { status: updated.status }), {
      show_alert: true
    });
  } catch (error) {
    logError("organizer_lifecycle_action_failed", { error });
    await ctx.answerCbQuery(t(locale, "action_update_failed"), { show_alert: true });
  }
}

logInfo("bot_initialized");
