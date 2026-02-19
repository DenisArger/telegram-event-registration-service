import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const mod = await import("../../apps/bot/api/telegram/webhook.js");
  return mod.default(req, res);
}
