import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const mod = await import("../apps/bot/api/ready.js");
    return mod.default(req, res);
  } catch (error) {
    console.error("ready_proxy_failed", { error });
    res.status(500).json({ message: "ready_proxy_failed" });
  }
}
