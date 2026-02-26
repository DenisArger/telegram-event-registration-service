import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getOrganizationTelegramBotTokenEncrypted } from "@event/db";
import { loadEnv, logError } from "@event/shared";
import { decryptSecret } from "../../src/crypto.js";
import { getBotForToken } from "../../src/botFactory.js";

const env = loadEnv(process.env);
const db = createServiceClient(process.env);

function readOrganizationId(req: VercelRequest): string | null {
  const queryValue = req.query?.organizationId;
  if (Array.isArray(queryValue)) return String(queryValue[0] ?? "").trim() || null;
  return String(queryValue ?? "").trim() || null;
}

async function resolveBotToken(req: VercelRequest): Promise<string> {
  const organizationId = readOrganizationId(req);
  if (!organizationId) {
    return env.TELEGRAM_BOT_TOKEN;
  }

  const encrypted = await getOrganizationTelegramBotTokenEncrypted(db, organizationId);
  if (!encrypted) return env.TELEGRAM_BOT_TOKEN;
  return decryptSecret(encrypted, process.env);
}

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
    const botToken = await resolveBotToken(req);
    const bot = getBotForToken(botToken);
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    logError("telegram_webhook_failed", { error });
    res.status(500).json({ ok: false });
  }
}
