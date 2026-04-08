import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getEventById, getUserById, promoteWaitlistUser } from "@event/db";
import { logError } from "@event/shared";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { readEventId, readOrganizationId, requireEventOrganizationAccess } from "../../src/adminOrgAccess.js";
import { getDefaultBotLocale, t } from "../../src/i18n.js";

const db = createServiceClient(process.env);

function readUserId(req: VercelRequest): string | null {
  const value = req.body?.userId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getTelegramToken(env: Record<string, string | undefined>): string {
  return String(env.TELEGRAM_BOT_TOKEN ?? "").trim();
}

async function sendTelegramMessage(
  telegramId: number,
  text: string,
  env: Record<string, string | undefined>
): Promise<void> {
  const token = getTelegramToken(env);
  if (!token) throw new Error("missing_telegram_bot_token");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: telegramId, text })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) throw new Error(String(payload?.description ?? "telegram_send_failed"));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;

  const eventId = readEventId(req);
  const userId = readUserId(req);
  const organizationId = readOrganizationId(req);
  if (!eventId || !userId) {
    sendError(res, 400, ctx.requestId, "request_invalid", "eventId and userId are required");
    return;
  }

  const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
  if (!hasAccess) return;

  try {
    const result = await promoteWaitlistUser(db, eventId, userId);
    if (result.status === "promoted" && result.user_id) {
      const [event, promotedUser] = await Promise.all([getEventById(db, eventId), getUserById(db, result.user_id)]);
      const eventTitle = event?.title?.trim() || eventId;
      const promotedName = promotedUser?.fullName?.trim() || "participant";
      const locale = getDefaultBotLocale(process.env);
      const participantMessage = t(locale, "waitlist_promoted_user", { eventTitle });
      const adminMessage = t(locale, "waitlist_promoted_admin", { eventTitle, userName: promotedName });
      const notifyTasks: Promise<void>[] = [];

      if (promotedUser?.telegramId) notifyTasks.push(sendTelegramMessage(promotedUser.telegramId, participantMessage, process.env));
      if (ctx.principal.telegramId) notifyTasks.push(sendTelegramMessage(ctx.principal.telegramId, adminMessage, process.env));

      await Promise.allSettled(notifyTasks);
    }

    res.status(200).json(result);
  } catch (error) {
    logError("admin_promote_waitlist_user_failed", { error, eventId, userId, requestId: ctx.requestId });
    sendError(res, 500, ctx.requestId, "promote_failed", "Failed to promote waitlist user");
  }
}
