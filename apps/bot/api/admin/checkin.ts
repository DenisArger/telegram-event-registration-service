import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, markCheckIn } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const eventId = String(req.body?.eventId ?? "").trim();
  const userId = String(req.body?.userId ?? "").trim();
  const method = req.body?.method === "qr" ? "qr" : "manual";

  if (!eventId || !userId) {
    res.status(400).json({ message: "eventId and userId are required" });
    return;
  }

  try {
    const result = await markCheckIn(db, { eventId, userId, method });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "registration_not_active") {
      res.status(400).json({ message: "Active registration required before check-in" });
      return;
    }

    logError("admin_checkin_failed", { error, eventId, userId });
    res.status(500).json({ message: "Failed to perform check-in" });
  }
}
