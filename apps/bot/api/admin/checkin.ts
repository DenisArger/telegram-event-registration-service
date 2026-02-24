import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, markCheckIn } from "@event/db";
import { logError } from "@event/shared";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { requireEventOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;

  const eventId = String(req.body?.eventId ?? "").trim();
  const organizationId = String(req.body?.organizationId ?? "").trim() || undefined;
  const userId = String(req.body?.userId ?? "").trim();
  const method = req.body?.method === "qr" ? "qr" : "manual";

  if (!eventId || !userId) {
    sendError(res, 400, ctx.requestId, "invalid_payload", "eventId and userId are required");
    return;
  }

  const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
  if (!hasAccess) return;

  try {
    const result = await markCheckIn(db, { eventId, userId, method });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "registration_not_active") {
      sendError(res, 400, ctx.requestId, "registration_not_active", "Active registration required before check-in");
      return;
    }

    logError("admin_checkin_failed", { error, requestId: ctx.requestId, eventId, userId });
    sendError(res, 500, ctx.requestId, "checkin_failed", "Failed to perform check-in");
  }
}
