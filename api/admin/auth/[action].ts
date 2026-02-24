import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = String(req.query.action ?? "").trim().toLowerCase();
  if (action === "telegram") {
    const mod = await import("../../../apps/bot/api/admin/auth/telegram");
    return mod.default(req, res);
  }
  if (action === "me") {
    const mod = await import("../../../apps/bot/api/admin/auth/me");
    return mod.default(req, res);
  }
  if (action === "logout") {
    const mod = await import("../../../apps/bot/api/admin/auth/logout");
    return mod.default(req, res);
  }
  if (action === "dev-login") {
    const mod = await import("../../../apps/bot/api/admin/auth/dev-login");
    return mod.default(req, res);
  }
  res.status(404).json({ message: "Not found" });
}
