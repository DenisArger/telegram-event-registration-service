import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createEvent, createServiceClient, listAllEvents } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";
import { applyCors } from "../../src/cors.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.method === "GET") {
    try {
      const events = await listAllEvents(db);
      res.status(200).json({ events });
    } catch (error) {
      logError("admin_events_failed", { error });
      res.status(500).json({ message: "Failed to load events" });
    }
    return;
  }

  const creatorId = String(process.env.ADMIN_DEFAULT_CREATOR_ID ?? "").trim();
  if (!creatorId) {
    res.status(500).json({ message: "ADMIN_DEFAULT_CREATOR_ID is not configured" });
    return;
  }

  const title = String(req.body?.title ?? "").trim();
  const startsAtRaw = String(req.body?.startsAt ?? "").trim();
  const capacity = Number(req.body?.capacity);
  const description = String(req.body?.description ?? "").trim() || null;
  const location = String(req.body?.location ?? "").trim() || null;

  if (!title) {
    res.status(400).json({ message: "title is required" });
    return;
  }

  if (!startsAtRaw) {
    res.status(400).json({ message: "startsAt is required" });
    return;
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    res.status(400).json({ message: "startsAt must be a valid date" });
    return;
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    res.status(400).json({ message: "capacity must be a positive integer" });
    return;
  }

  try {
    const event = await createEvent(db, {
      title,
      startsAt: startsAt.toISOString(),
      capacity,
      description,
      location,
      createdBy: creatorId
    });
    res.status(201).json({ event });
  } catch (error) {
    logError("admin_create_event_failed", { error, title, startsAt: startsAtRaw, capacity });
    res.status(500).json({ message: "Failed to create event" });
  }
}
