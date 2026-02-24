import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getUserByTelegramId } from "@event/db";
import { logError } from "@event/shared";
import { applyCors } from "../../../src/cors.js";
import { setAdminSession } from "../../../src/adminSession.js";
import { verifyTelegramLoginPayload } from "../../../src/adminTelegramAuth.js";
import { sendError } from "../../../src/adminApi.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secret = String(process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (!secret) {
    sendError(res, 500, "n/a", "session_secret_missing", "ADMIN_SESSION_SECRET is not configured");
    return;
  }

  const verification = verifyTelegramLoginPayload(req.body, process.env);
  if (!verification.ok) {
    sendError(res, 401, "n/a", "unauthorized", verification.error ?? "Unauthorized");
    return;
  }

  try {
    const user = await getUserByTelegramId(db, verification.payload!.id);
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
    logError("admin_auth_telegram_failed", { error });
    sendError(res, 500, "n/a", "admin_auth_failed", "Failed to authorize admin");
  }
}
