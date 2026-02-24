import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const mod = await import("../apps/bot/api/health.js");
    return mod.default(req, res);
  } catch (error) {
    console.error("health_proxy_failed", { error });
    res.status(500).json({ message: "health_proxy_failed" });
  }
}
