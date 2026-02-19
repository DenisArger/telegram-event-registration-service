import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, publishEvent } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";
import { applyCors } from "../../src/cors.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const eventId = String(req.body?.eventId ?? "").trim();
  if (!eventId) {
    res.status(400).json({ message: "eventId is required" });
    return;
  }

  try {
    const event = await publishEvent(db, eventId);
    if (!event) {
      res.status(400).json({ message: "Event must be in draft status" });
      return;
    }

    res.status(200).json({ event });
  } catch (error) {
    logError("admin_publish_failed", { error, eventId });
    res.status(500).json({ message: "Failed to publish event" });
  }
}
