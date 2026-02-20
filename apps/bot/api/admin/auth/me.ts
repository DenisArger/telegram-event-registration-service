import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../../../src/cors.js";
import { getAdminPrincipal } from "../../../src/adminSession.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const principal = getAdminPrincipal(req, process.env);
  if (!principal) {
    res.status(401).json({ authenticated: false });
    return;
  }

  res.status(200).json({
    authenticated: true,
    role: principal.role,
    userId: principal.userId,
    telegramId: principal.telegramId
  });
}
