import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getUserByTelegramId } from "@event/db";
import { logError } from "@event/shared";
import { applyCors } from "../../../src/cors.js";
import { setAdminSession } from "../../../src/adminSession.js";
import { sendError } from "../../../src/adminApi.js";

const db = createServiceClient(process.env);

function isUnsafeLoginEnabled(): boolean {
  return String(process.env.ADMIN_UNSAFE_LOGIN_ENABLED ?? "false").trim().toLowerCase() === "true";
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isUnsafeLoginEnabled()) {
    sendError(res, 403, "n/a", "unsafe_login_disabled", "unsafe_login_disabled");
    return;
  }

  const secret = String(process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (!secret) {
    sendError(res, 500, "n/a", "session_secret_missing", "ADMIN_SESSION_SECRET is not configured");
    return;
  }

  const telegramIdRaw = String(req.body?.telegramId ?? "").trim();
  const telegramId = Number(telegramIdRaw);
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    sendError(res, 400, "n/a", "invalid_payload", "telegramId must be a positive integer");
    return;
  }

  try {
    const user = await getUserByTelegramId(db, telegramId);
    if (!user) {
      sendError(res, 403, "n/a", "admin_user_not_found", "admin_user_not_found");
      return;
    }
    if (user.role !== "admin" && user.role !== "organizer") {
      sendError(res, 403, "n/a", "insufficient_role", "insufficient_role");
      return;
    }

    setAdminSession(
      res,
      { userId: user.id, telegramId: user.telegramId, role: user.role },
      process.env
    );

    res.status(200).json({
      ok: true,
      role: user.role,
      userId: user.id
    });
  } catch (error) {
    logError("admin_auth_dev_login_failed", { error, telegramId });
    sendError(res, 500, "n/a", "admin_auth_failed", "Failed to authorize admin");
  }
}
