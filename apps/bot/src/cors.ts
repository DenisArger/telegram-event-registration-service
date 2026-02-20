import type { VercelRequest, VercelResponse } from "@vercel/node";

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = String(req.headers.origin ?? "").trim();
  res.setHeader("access-control-allow-origin", origin || "*");
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", "content-type,x-admin-email");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}
