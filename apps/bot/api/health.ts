import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  // Keep explicit health payload for uptime checks and smoke tests.
  res.status(200).json({ status: "ok" });
}
