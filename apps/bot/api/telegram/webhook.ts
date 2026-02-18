import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bot } from "../../src/runtime";
import { loadEnv, logError } from "@event/shared";

const env = loadEnv(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    logError("telegram_webhook_failed", { error });
    res.status(500).json({ ok: false });
  }
}
