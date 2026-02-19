import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createEvent, createServiceClient, listAllEvents, upsertEventQuestions } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";
import { applyCors } from "../../src/cors.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const eventId = String(req.query.eventId ?? "").trim();

    if (eventId) {
      try {
        const { data, error } = await db
          .from("events")
          .select("id,title,description,location,starts_at,ends_at,capacity,status")
          .eq("id", eventId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          res.status(404).json({ message: "Event not found" });
          return;
        }

        res.status(200).json({
          event: {
            id: data.id,
            title: data.title,
            description: data.description,
            location: data.location,
            startsAt: data.starts_at,
            endsAt: data.ends_at,
            capacity: data.capacity,
            status: data.status
          }
        });
      } catch (error) {
        logError("admin_event_get_failed", { error, eventId });
        res.status(500).json({ message: "Failed to load event" });
      }
      return;
    }

    try {
      const events = await listAllEvents(db);
      res.status(200).json({ events });
    } catch (error) {
      logError("admin_events_failed", { error });
      res.status(500).json({ message: "Failed to load events" });
    }
    return;
  }

  if (req.method === "PUT") {
    const eventId = String(req.body?.eventId ?? "").trim();
    const title = String(req.body?.title ?? "").trim();
    const startsAtRaw = String(req.body?.startsAt ?? "").trim();
    const endsAtRaw = String(req.body?.endsAt ?? "").trim();
    const capacityRaw = String(req.body?.capacity ?? "").trim();
    const description = String(req.body?.description ?? "").trim() || null;
    const location = String(req.body?.location ?? "").trim() || null;

    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }
    if (!title) {
      res.status(400).json({ message: "title is required" });
      return;
    }
    const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
    if (startsAtRaw && (!startsAt || Number.isNaN(startsAt.getTime()))) {
      res.status(400).json({ message: "startsAt must be a valid date" });
      return;
    }
    const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
    if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) {
      res.status(400).json({ message: "endsAt must be a valid date" });
      return;
    }
    if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
      res.status(400).json({ message: "endsAt must be greater than startsAt" });
      return;
    }

    const capacity = capacityRaw ? Number(capacityRaw) : null;
    if (capacityRaw && (!Number.isInteger(capacity) || (capacity ?? 0) <= 0)) {
      res.status(400).json({ message: "capacity must be a positive integer" });
      return;
    }

    try {
      const { data, error } = await db
        .from("events")
        .update({
          title,
          description,
          location,
          starts_at: startsAt ? startsAt.toISOString() : null,
          ends_at: endsAt ? endsAt.toISOString() : null,
          capacity
        })
        .eq("id", eventId)
        .select("id,title,description,location,starts_at,ends_at,capacity,status")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      res.status(200).json({
        event: {
          id: data.id,
          title: data.title,
          description: data.description,
          location: data.location,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          capacity: data.capacity,
          status: data.status
        }
      });
    } catch (error) {
      logError("admin_event_update_failed", { error, eventId });
      res.status(500).json({ message: "Failed to update event" });
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
  const endsAtRaw = String(req.body?.endsAt ?? "").trim();
  const capacityRaw = String(req.body?.capacity ?? "").trim();
  const description = String(req.body?.description ?? "").trim() || null;
  const location = String(req.body?.location ?? "").trim() || null;
  const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];

  if (!title) {
    res.status(400).json({ message: "title is required" });
    return;
  }

  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
  if (startsAtRaw && (!startsAt || Number.isNaN(startsAt.getTime()))) {
    res.status(400).json({ message: "startsAt must be a valid date" });
    return;
  }
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) {
    res.status(400).json({ message: "endsAt must be a valid date" });
    return;
  }
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    res.status(400).json({ message: "endsAt must be greater than startsAt" });
    return;
  }

  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacityRaw && (!Number.isInteger(capacity) || (capacity ?? 0) <= 0)) {
    res.status(400).json({ message: "capacity must be a positive integer" });
    return;
  }

  if (rawQuestions.length > 10) {
    res.status(400).json({ message: "questions count must be <= 10" });
    return;
  }

  const questions: Array<{ prompt: string; isRequired: boolean; position: number }> = rawQuestions.map((item: any, index: number) => ({
    prompt: String(item?.prompt ?? "").trim(),
    isRequired: Boolean(item?.required),
    position: index + 1
  }));

  if (questions.some((item) => item.prompt.length < 1 || item.prompt.length > 500)) {
    res.status(400).json({ message: "question prompt length must be 1..500" });
    return;
  }

  try {
    const event = await createEvent(db, {
      title,
      startsAt: startsAt ? startsAt.toISOString() : null,
      endsAt: endsAt ? endsAt.toISOString() : null,
      capacity,
      description,
      location,
      createdBy: creatorId
    });
    const savedQuestions =
      questions.length > 0 ? await upsertEventQuestions(db, event.id, questions) : [];

    res.status(201).json({ event, questions: savedQuestions });
  } catch (error) {
    logError("admin_create_event_failed", { error, title, startsAt: startsAtRaw, capacity });
    res.status(500).json({ message: "Failed to create event" });
  }
}
