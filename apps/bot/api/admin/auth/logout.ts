import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../../../src/cors.js";
import { clearAdminSession } from "../../../src/adminSession.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  clearAdminSession(res, process.env);
  res.status(200).json({ ok: true });
}
