import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const routeParam = req.query.route;
  const route = Array.isArray(routeParam) ? routeParam[0] : routeParam;

  if (!route) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (route === "ai-draft") {
    const mod = await import("../../apps/bot/api/admin/ai-draft");
    return mod.default(req, res);
  }
  if (route === "attendees") {
    const mod = await import("../../apps/bot/api/admin/attendees");
    return mod.default(req, res);
  }
  if (route === "close") {
    const mod = await import("../../apps/bot/api/admin/close");
    return mod.default(req, res);
  }
  if (route === "event-questions") {
    const mod = await import("../../apps/bot/api/admin/event-questions");
    return mod.default(req, res);
  }
  if (route === "events") {
    const mod = await import("../../apps/bot/api/admin/events");
    return mod.default(req, res);
  }
  if (route === "export") {
    const mod = await import("../../apps/bot/api/admin/export");
    return mod.default(req, res);
  }
  if (route === "promote") {
    const mod = await import("../../apps/bot/api/admin/promote");
    return mod.default(req, res);
  }
  if (route === "publish") {
    const mod = await import("../../apps/bot/api/admin/publish");
    return mod.default(req, res);
  }
  if (route === "stats") {
    const mod = await import("../../apps/bot/api/admin/stats");
    return mod.default(req, res);
  }
  if (route === "waitlist") {
    const mod = await import("../../apps/bot/api/admin/waitlist");
    return mod.default(req, res);
  }

  res.status(404).json({ error: "Not found" });
}
