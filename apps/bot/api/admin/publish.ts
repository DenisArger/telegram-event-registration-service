import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, publishEvent } from "@event/db";
import { logError } from "@event/shared";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { readEventId, readOrganizationId, requireEventOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
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
    const event = await publishEvent(db, eventId);
    if (!event) {
      sendError(res, 400, ctx.requestId, "invalid_event_state", "Event must be in draft status");
      return;
    }

    res.status(200).json({ event });
  } catch (error) {
    logError("admin_publish_failed", { error, eventId, requestId: ctx.requestId });
    sendError(res, 500, ctx.requestId, "publish_failed", "Failed to publish event");
  }
}
