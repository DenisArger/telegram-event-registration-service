import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, listEventAttendees, listEventWaitlist } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth";
import { buildEventExportCsv } from "../../src/csv";

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

  const eventId = String(req.query.eventId ?? "").trim();
  if (!eventId) {
    res.status(400).json({ message: "eventId is required" });
    return;
  }

  try {
    const [attendees, waitlist] = await Promise.all([
      listEventAttendees(db, eventId),
      listEventWaitlist(db, eventId)
    ]);

    const csv = buildEventExportCsv(eventId, attendees, waitlist);
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename=\"event-${eventId}.csv\"`);
    res.status(200).send(csv);
  } catch (error) {
    logError("admin_export_failed", { error, eventId });
    res.status(500).json({ message: "Failed to export CSV" });
  }
}
