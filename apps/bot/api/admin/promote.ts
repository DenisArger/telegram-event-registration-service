import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, promoteNextFromWaitlist } from "@event/db";
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
    const result = await promoteNextFromWaitlist(db, eventId);
    res.status(200).json(result);
  } catch (error) {
    logError("admin_promote_failed", { error, eventId, requestId: ctx.requestId });
    sendError(res, 500, ctx.requestId, "promote_failed", "Failed to promote waitlist user");
  }
}
