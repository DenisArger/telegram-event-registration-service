import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, promoteNextFromWaitlist } from "@event/db";
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
  if (!eventId) {
    res.status(400).json({ message: "eventId is required" });
    return;
  }

  try {
    const result = await promoteNextFromWaitlist(db, eventId);
    res.status(200).json(result);
  } catch (error) {
    logError("admin_promote_failed", { error, eventId });
    res.status(500).json({ message: "Failed to promote waitlist user" });
  }
}
