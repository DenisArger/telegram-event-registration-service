import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertEventInOrg, createEvent, createServiceClient, listAllEvents, upsertEventQuestions } from "@event/db";
import { logError } from "@event/shared";
import { isOrganizationContextRequired, requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { readEventId, readOrganizationId, requireEventOrganizationAccess, requireOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseCapacity(raw: string): { value: number | null; error?: string } {
  if (!raw) return { value: null };
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    return { value: null, error: "capacity must be a positive integer" };
  }
  return { value: num };
}

function parseQuestions(raw: unknown): { value: Array<{ prompt: string; isRequired: boolean; position: number }>; error?: string } {
  if (!Array.isArray(raw)) return { value: [] };
  if (raw.length > 10) {
    return { value: [], error: "questions count must be <= 10" };
  }
  const mapped = raw.map((item: any, index: number) => ({
    prompt: String(item?.prompt ?? "").trim(),
    isRequired: Boolean(item?.required),
    position: index + 1
  }));
  if (mapped.some((item) => item.prompt.length < 1 || item.prompt.length > 500)) {
    return { value: [], error: "question prompt length must be 1..500" };
  }
  return { value: mapped };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT" && req.method !== "DELETE") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;
  const requireOrg = isOrganizationContextRequired(process.env);

  if (req.method === "GET") {
    const organizationId = readOrganizationId(req) || undefined;
    const eventId = readEventId(req);

    if (requireOrg && !organizationId) {
      sendError(res, 400, ctx.requestId, "organization_required", "organizationId is required");
      return;
    }

    try {
      if (organizationId) {
        const hasOrgAccess = await requireOrganizationAccess(req, res, db, ctx, organizationId);
        if (!hasOrgAccess) return;
      }

      if (eventId) {
        const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
        if (!hasAccess) return;

        const query = db
          .from("events")
          .select("id,organization_id,title,description,location,starts_at,ends_at,capacity,registration_success_message,status")
          .eq("id", eventId)
          .is("deleted_at", null);
        const { data, error } = organizationId
          ? await query.eq("organization_id", organizationId).maybeSingle()
          : await query.maybeSingle();

        if (error) throw error;
        if (!data) {
          res.status(404).json({ message: "Event not found" });
          return;
        }

        res.status(200).json({
          event: {
            id: data.id,
            organizationId: (data as any).organization_id,
            title: data.title,
            description: data.description,
            location: data.location,
            startsAt: data.starts_at,
            endsAt: data.ends_at,
            capacity: data.capacity,
            registrationSuccessMessage: data.registration_success_message,
            status: data.status
          }
        });
        return;
      }

      const events = await listAllEvents(db, organizationId);
      res.status(200).json({ events });
    } catch (error) {
      if (eventId) {
        logError("admin_event_get_failed", { error, eventId });
        res.status(500).json({ message: "Failed to load event" });
      } else {
        logError("admin_events_failed", { error });
        res.status(500).json({ message: "Failed to load events" });
      }
    }
    return;
  }

  const organizationId = String(req.body?.organizationId ?? "").trim() || undefined;
  if (requireOrg && !organizationId) {
    sendError(res, 400, ctx.requestId, "organization_required", "organizationId is required");
    return;
  }
  if (organizationId) {
    const hasOrgAccess = await requireOrganizationAccess(req, res, db, ctx, organizationId);
    if (!hasOrgAccess) return;
  }

  if (req.method === "DELETE") {
    const eventId = String(req.body?.eventId ?? "").trim();
    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    const hasEventAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
    if (!hasEventAccess) return;

    try {
      const baseQuery = db
        .from("events")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", eventId)
        .is("deleted_at", null);

      const { data, error } = organizationId
        ? await baseQuery
          .eq("organization_id", organizationId)
          .select("id")
          .maybeSingle()
        : await baseQuery
          .select("id")
          .maybeSingle();

      if (error) throw error;
      if (!data) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      res.status(200).json({ eventId: data.id });
    } catch (error) {
      logError("admin_event_delete_failed", { error, eventId, organizationId });
      res.status(500).json({ message: "Failed to delete event" });
    }
    return;
  }

  if (req.method === "PUT") {
    const eventId = String(req.body?.eventId ?? "").trim();
    const title = String(req.body?.title ?? "").trim();
    const startsAtRaw = String(req.body?.startsAt ?? "").trim();
    const endsAtRaw = String(req.body?.endsAt ?? "").trim();
    const capacityRaw = String(req.body?.capacity ?? "").trim();
    const registrationSuccessMessage = String(req.body?.registrationSuccessMessage ?? "").trim() || null;
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

    const startsAtIso = startsAtRaw ? toIsoOrNull(startsAtRaw) : null;
    if (startsAtRaw && !startsAtIso) {
      res.status(400).json({ message: "startsAt must be a valid date" });
      return;
    }
    const endsAtIso = endsAtRaw ? toIsoOrNull(endsAtRaw) : null;
    if (endsAtRaw && !endsAtIso) {
      res.status(400).json({ message: "endsAt must be a valid date" });
      return;
    }
    if (startsAtIso && endsAtIso && new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      res.status(400).json({ message: "endsAt must be greater than startsAt" });
      return;
    }

    const capacity = parseCapacity(capacityRaw);
    if (capacity.error) {
      res.status(400).json({ message: capacity.error });
      return;
    }
    if (registrationSuccessMessage && registrationSuccessMessage.length > 4000) {
      res.status(400).json({ message: "registrationSuccessMessage is too long" });
      return;
    }

    if (organizationId) {
      const hasEventAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
      if (!hasEventAccess) return;
    }

    try {
      const query = db
        .from("events")
        .update({
          title,
          description,
          location,
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          capacity: capacity.value,
          registration_success_message: registrationSuccessMessage
        })
        .eq("id", eventId);

      const { data, error } = organizationId
        ? await query
          .eq("organization_id", organizationId)
          .select("id,organization_id,title,description,location,starts_at,ends_at,capacity,registration_success_message,status")
          .maybeSingle()
        : await query
          .select("id,organization_id,title,description,location,starts_at,ends_at,capacity,registration_success_message,status")
          .maybeSingle();

      if (error) throw error;
      if (!data) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      res.status(200).json({
        event: {
          id: data.id,
          organizationId: (data as any).organization_id,
          title: data.title,
          description: data.description,
          location: data.location,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          capacity: data.capacity,
          registrationSuccessMessage: data.registration_success_message,
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
  const registrationSuccessMessage = String(req.body?.registrationSuccessMessage ?? "").trim() || null;
  const description = String(req.body?.description ?? "").trim() || null;
  const location = String(req.body?.location ?? "").trim() || null;
  const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];

  if (!title) {
    res.status(400).json({ message: "title is required" });
    return;
  }

  const startsAtIso = startsAtRaw ? toIsoOrNull(startsAtRaw) : null;
  if (startsAtRaw && !startsAtIso) {
    res.status(400).json({ message: "startsAt must be a valid date" });
    return;
  }
  const endsAtIso = endsAtRaw ? toIsoOrNull(endsAtRaw) : null;
  if (endsAtRaw && !endsAtIso) {
    res.status(400).json({ message: "endsAt must be a valid date" });
    return;
  }
  if (startsAtIso && endsAtIso && new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
    res.status(400).json({ message: "endsAt must be greater than startsAt" });
    return;
  }

  const capacity = parseCapacity(capacityRaw);
  if (capacity.error) {
    res.status(400).json({ message: capacity.error });
    return;
  }
  if (registrationSuccessMessage && registrationSuccessMessage.length > 4000) {
    res.status(400).json({ message: "registrationSuccessMessage is too long" });
    return;
  }

  const questions = parseQuestions(rawQuestions);
  if (questions.error) {
    res.status(400).json({ message: questions.error });
    return;
  }

  try {
    const event = await createEvent(db, {
      title,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      capacity: capacity.value,
      registrationSuccessMessage,
      description,
      location,
      createdBy: creatorId,
      organizationId
    });

    if (organizationId) {
      const inScope = await assertEventInOrg(db, event.id, organizationId);
      if (!inScope) {
        sendError(res, 500, ctx.requestId, "event_scope_error", "Event created outside organization scope");
        return;
      }
    }

    const savedQuestions =
      questions.value.length > 0 ? await upsertEventQuestions(db, event.id, questions.value) : [];

    res.status(201).json({ event, questions: savedQuestions });
  } catch (error) {
    logError("admin_create_event_failed", { error, title, startsAt: startsAtRaw, capacity: capacity.value });
    res.status(500).json({ message: "Failed to create event" });
  }
}
