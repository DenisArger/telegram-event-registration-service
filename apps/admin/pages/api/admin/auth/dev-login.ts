import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClientLoose, getUserByTelegramId } from "@event/db";
import { clearSession, writeSession } from "../../../../lib/admin-session";

function applyCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = String(req.headers.origin ?? "").trim();
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
  }
  res.setHeader("access-control-allow-methods", "POST,OPTIONS");
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", "content-type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (String(process.env.ADMIN_UNSAFE_LOGIN_ENABLED ?? "false").trim().toLowerCase() !== "true") {
    res.status(403).json({ message: "unsafe_login_disabled" });
    return;
  }

  const telegramId = Number(String(req.body?.telegramId ?? "").trim());
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    res.status(400).json({ message: "telegramId must be a positive integer" });
    return;
  }

  try {
    const db = createServiceClientLoose(process.env);
    const user = await getUserByTelegramId(db, telegramId);
    if (!user) {
      res.status(403).json({ message: "admin_user_not_found" });
      return;
    }
    if (user.role !== "admin" && user.role !== "organizer") {
      res.status(403).json({ message: "insufficient_role" });
      return;
    }

    writeSession(res, {
      userId: user.id,
      telegramId: user.telegramId,
      role: user.role
    });
    res.status(200).json({ ok: true, role: user.role, userId: user.id });
  } catch (error) {
    clearSession(res);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to authorize admin" });
  }
}
