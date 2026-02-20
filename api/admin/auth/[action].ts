import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = String(req.query.action ?? "").trim().toLowerCase();
  if (action === "telegram") {
    const mod = await import("../../../apps/bot/api/admin/auth/telegram.js");
    return mod.default(req, res);
  }
  if (action === "me") {
    const mod = await import("../../../apps/bot/api/admin/auth/me.js");
    return mod.default(req, res);
  }
  if (action === "logout") {
    const mod = await import("../../../apps/bot/api/admin/auth/logout.js");
    return mod.default(req, res);
  }
  res.status(404).json({ message: "Not found" });
}
