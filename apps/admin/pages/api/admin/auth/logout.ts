import type { NextApiRequest, NextApiResponse } from "next";
import { clearSession } from "../../../../lib/admin-session";

function applyCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = String(req.headers.origin ?? "").trim();
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
  }
  res.setHeader("access-control-allow-methods", "POST,OPTIONS");
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", "content-type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  clearSession(res);
  res.status(200).json({ ok: true });
}
