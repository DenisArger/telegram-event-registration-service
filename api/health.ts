import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const mod = await import("../apps/bot/api/health");
  return mod.default(req, res);
}
