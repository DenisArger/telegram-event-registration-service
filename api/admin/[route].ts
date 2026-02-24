import type { VercelRequest, VercelResponse } from "@vercel/node";

const allowedRoutes = new Set([
  "ai-draft",
  "attendees",
  "close",
  "event-questions",
  "events",
  "export",
  "promote",
  "publish",
  "stats",
  "waitlist",
]);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const routeParam = req.query.route;
  const route = Array.isArray(routeParam) ? routeParam[0] : routeParam;

  if (!route || !allowedRoutes.has(route)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const mod = await import(`../../apps/bot/api/admin/${route}.js`);
  return mod.default(req, res);
}
