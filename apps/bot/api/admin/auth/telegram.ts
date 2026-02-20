import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getUserByTelegramId } from "@event/db";
import { logError } from "@event/shared";
import { applyCors } from "../../../src/cors.js";
import { setAdminSession } from "../../../src/adminSession.js";
import { verifyTelegramLoginPayload } from "../../../src/adminTelegramAuth.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secret = String(process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (!secret) {
    res.status(500).json({ message: "ADMIN_SESSION_SECRET is not configured" });
    return;
  }

  const verification = verifyTelegramLoginPayload(req.body, process.env);
  if (!verification.ok) {
    res.status(401).json({ message: verification.error ?? "Unauthorized" });
    return;
  }

  try {
    const user = await getUserByTelegramId(db, verification.payload!.id);
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
    logError("admin_auth_telegram_failed", { error });
    res.status(500).json({ message: "Failed to authorize admin" });
  }
}
