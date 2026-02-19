import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, listAllEvents } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const events = await listAllEvents(db);
    res.status(200).json({ events });
  } catch (error) {
    logError("admin_events_failed", { error });
    res.status(500).json({ message: "Failed to load events" });
  }
}
