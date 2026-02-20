import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getUserByTelegramId } from "@event/db";
import { logError } from "@event/shared";
import { applyCors } from "../../../src/cors.js";
import { setAdminSession } from "../../../src/adminSession.js";

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
    res.status(403).json({ message: "unsafe_login_disabled" });
    return;
  }

  const secret = String(process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (!secret) {
    res.status(500).json({ message: "ADMIN_SESSION_SECRET is not configured" });
    return;
  }

  const telegramIdRaw = String(req.body?.telegramId ?? "").trim();
  const telegramId = Number(telegramIdRaw);
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    res.status(400).json({ message: "telegramId must be a positive integer" });
    return;
  }

  try {
    const user = await getUserByTelegramId(db, telegramId);
    if (!user) {
      res.status(403).json({ message: "admin_user_not_found" });
      return;
    }
    if (user.role !== "admin" && user.role !== "organizer") {
      res.status(403).json({ message: "insufficient_role" });
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
    res.status(500).json({ message: "Failed to authorize admin" });
  }
}
