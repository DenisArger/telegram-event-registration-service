import type { VercelRequest, VercelResponse } from "@vercel/node";

function resolveCorsOrigin(req: VercelRequest, envSource: Record<string, string | undefined>): string {
  const requestOrigin = String(req.headers.origin ?? "").trim();
  const configured = String(envSource.ADMIN_CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured.length === 0) {
    return requestOrigin || "*";
  }
  if (requestOrigin && configured.includes(requestOrigin)) {
    return requestOrigin;
  }
  return configured[0] ?? "*";
}

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader("access-control-allow-origin", resolveCorsOrigin(req, process.env));
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", "content-type,x-admin-email");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}
