import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  cancelRegistration,
  createServiceClient,
  listEventAttendees,
  saveEventAttendeeOrder,
  saveEventAttendeeRowColor
} from "@event/db";
import { logError } from "@event/shared";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { readEventId, readOrganizationId, requireEventOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasUniqueItems(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (applyCors(req, res)) return;

    if (req.method !== "GET" && req.method !== "PUT" && req.method !== "DELETE") {
      res.status(405).json({ message: "Method not allowed" });
      return;
    }

    const ctx = requireAdminSession(req, res, process.env);
    if (!ctx) return;

    if (req.method === "GET") {
      const eventId = readEventId(req);
      const organizationId = readOrganizationId(req) || undefined;
      if (!eventId) {
        sendError(res, 400, ctx.requestId, "event_required", "eventId is required");
        return;
      }

      const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
      if (!hasAccess) return;

      try {
        const attendees = await listEventAttendees(db, eventId);
        res.status(200).json({ attendees });
      } catch (error) {
        logError("admin_attendees_failed", { error, eventId, requestId: ctx.requestId });
        sendError(res, 500, ctx.requestId, "attendees_load_failed", "Failed to load attendees");
      }
      return;
    }

    if (req.method === "DELETE") {
      const eventId = String(req.body?.eventId ?? "").trim();
      const organizationId = String(req.body?.organizationId ?? "").trim() || undefined;
      const userId = String(req.body?.userId ?? "").trim();

      if (!eventId || !userId) {
        sendError(res, 400, ctx.requestId, "invalid_payload", "eventId and userId are required");
        return;
      }

      const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
      if (!hasAccess) return;

      try {
        const result = await cancelRegistration(db, eventId, userId);
        if (result.status === "not_registered") {
          sendError(res, 404, ctx.requestId, "registration_not_found", "Registration not found");
          return;
        }

        res.status(200).json(result);
      } catch (error) {
        logError("admin_attendees_cancel_failed", {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          eventId,
          userId,
          requestId: ctx.requestId
        });
        sendError(res, 500, ctx.requestId, "cancel_registration_failed", "Failed to cancel registration");
      }
      return;
    }

    const eventId = String(req.body?.eventId ?? "").trim();
    const organizationId = String(req.body?.organizationId ?? "").trim() || undefined;
    if (!eventId) {
      sendError(res, 400, ctx.requestId, "event_required", "eventId is required");
      return;
    }
    const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
    if (!hasAccess) return;

    const rawOrderedUserIds = req.body?.orderedUserIds;
    const colorUpdate = req.body?.colorUpdate;
    const isReorderPayload = Array.isArray(rawOrderedUserIds);
    const isColorPayload = colorUpdate && typeof colorUpdate === "object";

    if (!isReorderPayload && !isColorPayload) {
      sendError(res, 400, ctx.requestId, "invalid_payload", "invalid attendees update payload");
      return;
    }

    if (isReorderPayload) {
      if (rawOrderedUserIds.length === 0) {
        sendError(res, 400, ctx.requestId, "invalid_payload", "orderedUserIds must be a non-empty array");
        return;
      }

      const orderedUserIds = rawOrderedUserIds.map((item: unknown) => String(item ?? "").trim());
      if (orderedUserIds.some((value) => !UUID_RE.test(value))) {
        sendError(res, 400, ctx.requestId, "invalid_payload", "orderedUserIds must contain valid UUID values");
        return;
      }

      if (!hasUniqueItems(orderedUserIds)) {
        sendError(res, 400, ctx.requestId, "invalid_payload", "orderedUserIds must not contain duplicates");
        return;
      }

      try {
        const attendees = await listEventAttendees(db, eventId);
        const activeAttendees = attendees.filter((item) => item.status === "registered");
        const attendeeIds = activeAttendees.map((item) => item.userId);
        if (attendeeIds.length !== orderedUserIds.length) {
          sendError(res, 400, ctx.requestId, "invalid_payload", "orderedUserIds must match active attendees");
          return;
        }
        const attendeeSet = new Set(attendeeIds);
        if (!orderedUserIds.every((userId) => attendeeSet.has(userId))) {
          sendError(res, 400, ctx.requestId, "invalid_payload", "orderedUserIds must match active attendees");
          return;
        }

        await saveEventAttendeeOrder(db, eventId, orderedUserIds);
        res.status(200).json({ ok: true });
      } catch (error) {
        logError("admin_attendees_order_failed", {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          eventId,
          orderedUserIds,
          requestId: ctx.requestId
        });
        sendError(res, 500, ctx.requestId, "attendees_order_failed", "Failed to save attendees order");
      }
      return;
    }

    const userId = String(colorUpdate?.userId ?? "").trim();
    const rowColorRaw = colorUpdate?.rowColor;
    const rowColor = rowColorRaw === null ? null : String(rowColorRaw ?? "").trim();
    if (!UUID_RE.test(userId)) {
      sendError(res, 400, ctx.requestId, "invalid_payload", "colorUpdate.userId must be a valid UUID");
      return;
    }
    if (rowColor !== null && !HEX_COLOR_RE.test(rowColor)) {
      sendError(res, 400, ctx.requestId, "invalid_payload", "colorUpdate.rowColor must be null or HEX #RRGGBB");
      return;
    }

    try {
      const attendees = await listEventAttendees(db, eventId);
      if (!attendees.some((item) => item.userId === userId && item.status === "registered")) {
        sendError(res, 400, ctx.requestId, "invalid_payload", "colorUpdate user must match event attendees");
        return;
      }

      await saveEventAttendeeRowColor(db, eventId, userId, rowColor);
      res.status(200).json({ ok: true });
    } catch (error) {
      logError("admin_attendees_color_failed", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        eventId,
        userId,
        rowColor,
        requestId: ctx.requestId
      });
      sendError(res, 500, ctx.requestId, "attendees_color_failed", "Failed to save attendee color");
    }
  } catch (error) {
    logError("admin_attendees_unhandled_failed", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      method: req.method,
      requestId: String(req.headers["x-request-id"] ?? "")
    });
    if (!res.writableEnded) {
      sendError(res, 500, String(req.headers["x-request-id"] ?? ""), "attendees_unhandled_failed", "Failed to handle attendees request");
    }
  }
}
