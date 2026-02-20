import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, listEventAttendees, saveEventAttendeeOrder, saveEventAttendeeRowColor } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";
import { applyCors } from "../../src/cors.js";

const db = createServiceClient(process.env);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function hasUniqueItems(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const eventId = String(req.query.eventId ?? "").trim();
    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    try {
      const attendees = await listEventAttendees(db, eventId);
      res.status(200).json({ attendees });
    } catch (error) {
      logError("admin_attendees_failed", { error, eventId });
      res.status(500).json({ message: "Failed to load attendees" });
    }
    return;
  }

  const eventId = String(req.body?.eventId ?? "").trim();
  if (!eventId) {
    res.status(400).json({ message: "eventId is required" });
    return;
  }

  const rawOrderedUserIds = req.body?.orderedUserIds;
  const colorUpdate = req.body?.colorUpdate;
  const isReorderPayload = Array.isArray(rawOrderedUserIds);
  const isColorPayload = colorUpdate && typeof colorUpdate === "object";

  if (!isReorderPayload && !isColorPayload) {
    res.status(400).json({ message: "invalid attendees update payload" });
    return;
  }

  if (isReorderPayload) {
    if (rawOrderedUserIds.length === 0) {
      res.status(400).json({ message: "orderedUserIds must be a non-empty array" });
      return;
    }

    const orderedUserIds = rawOrderedUserIds.map((item: unknown) => String(item ?? "").trim());
    if (orderedUserIds.some((value) => !UUID_RE.test(value))) {
      res.status(400).json({ message: "orderedUserIds must contain valid UUID values" });
      return;
    }

    if (!hasUniqueItems(orderedUserIds)) {
      res.status(400).json({ message: "orderedUserIds must not contain duplicates" });
      return;
    }

    try {
      const attendees = await listEventAttendees(db, eventId);
      const attendeeIds = attendees.map((item) => item.userId);
      if (attendeeIds.length !== orderedUserIds.length) {
        res.status(400).json({ message: "orderedUserIds must match event attendees" });
        return;
      }

      const attendeeSet = new Set(attendeeIds);
      if (!orderedUserIds.every((userId) => attendeeSet.has(userId))) {
        res.status(400).json({ message: "orderedUserIds must match event attendees" });
        return;
      }

      await saveEventAttendeeOrder(db, eventId, orderedUserIds);
      res.status(200).json({ ok: true });
    } catch (error) {
      logError("admin_attendees_order_failed", { error, eventId });
      res.status(500).json({ message: "Failed to save attendees order" });
    }
    return;
  }

  const userId = String(colorUpdate?.userId ?? "").trim();
  const rowColorRaw = colorUpdate?.rowColor;
  if (!UUID_RE.test(userId)) {
    res.status(400).json({ message: "colorUpdate.userId must be a valid UUID" });
    return;
  }

  const rowColor = rowColorRaw === null ? null : String(rowColorRaw ?? "").trim();
  if (rowColor !== null && !HEX_COLOR_RE.test(rowColor)) {
    res.status(400).json({ message: "colorUpdate.rowColor must be null or HEX #RRGGBB" });
    return;
  }

  try {
    const attendees = await listEventAttendees(db, eventId);
    if (!attendees.some((item) => item.userId === userId)) {
      res.status(400).json({ message: "colorUpdate user must match event attendees" });
      return;
    }

    await saveEventAttendeeRowColor(db, eventId, userId, rowColor);
    res.status(200).json({ ok: true });
  } catch (error) {
    logError("admin_attendees_color_failed", { error, eventId, userId });
    res.status(500).json({ message: "Failed to save attendee color" });
  }
}
