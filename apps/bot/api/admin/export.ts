import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, listEventAttendees, listEventWaitlist } from "@event/db";
import { logError } from "@event/shared";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { buildEventExportWorkbook } from "../../src/exportWorkbook.js";
import { applyCors } from "../../src/cors.js";
import { readEventId, readOrganizationId, requireEventOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;

  const eventId = readEventId(req);
  const organizationId = readOrganizationId(req);
  if (!eventId) {
    sendError(res, 400, ctx.requestId, "event_required", "eventId is required");
    return;
  }

  const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
  if (!hasAccess) return;

  try {
    const [attendees, waitlist] = await Promise.all([
      listEventAttendees(db, eventId),
      listEventWaitlist(db, eventId)
    ]);

    const workbook = await buildEventExportWorkbook(eventId, attendees, waitlist);
    res.setHeader("x-request-id", ctx.requestId);
    res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("content-disposition", `attachment; filename=\"event-${eventId}.xlsx\"`);
    res.status(200).send(workbook);
  } catch (error) {
    logError("admin_export_failed", { error, eventId, requestId: ctx.requestId });
    sendError(res, 500, ctx.requestId, "export_failed", "Failed to export Excel");
  }
}
