import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClientLoose } from "@event/db";

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const db = createServiceClientLoose(process.env);
    const { error } = await db.from("users").select("id", { head: true, count: "exact" }).limit(1);
    if (error) {
      res.status(503).json({ status: "degraded", message: "database_unavailable" });
      return;
    }
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "degraded", message: "readiness_failed" });
  }
}
