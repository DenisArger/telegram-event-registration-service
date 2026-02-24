import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, listEventQuestions, upsertEventQuestions } from "@event/db";
import { logError } from "@event/shared";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { readEventId, readOrganizationId, requireEventOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);

function normalizeQuestions(raw: unknown): Array<{ id?: string; prompt: string; isRequired: boolean; position: number }> {
  if (!Array.isArray(raw)) {
    throw new Error("questions must be an array");
  }
  if (raw.length > 10) {
    throw new Error("questions count must be <= 10");
  }

  return raw.map((item: any, index: number) => {
    const prompt = String(item?.prompt ?? "").trim();
    if (prompt.length < 1 || prompt.length > 500) {
      throw new Error("question prompt length must be 1..500");
    }
    const id = String(item?.id ?? "").trim() || undefined;
    return {
      id,
      prompt,
      isRequired: Boolean(item?.required ?? item?.isRequired),
      position: index + 1
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "PUT") {
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
      const questions = await listEventQuestions(db, eventId);
      res.status(200).json({ questions });
    } catch (error) {
      logError("admin_event_questions_get_failed", { error, eventId, requestId: ctx.requestId });
      sendError(res, 500, ctx.requestId, "event_questions_failed", "Failed to load event questions");
    }
    return;
  }

  const eventId = String(req.body?.eventId ?? "").trim();
  const organizationId = String(req.body?.organizationId ?? "").trim() || undefined;
  if (!eventId) {
    sendError(res, 400, ctx.requestId, "event_required", "eventId is required");
    return;
  }

  let questions: Array<{ id?: string; prompt: string; isRequired: boolean; position: number }>;
  try {
    questions = normalizeQuestions(req.body?.questions);
  } catch (error) {
    sendError(res, 400, ctx.requestId, "invalid_payload", error instanceof Error ? error.message : "Invalid questions");
    return;
  }

  const hasAccess = await requireEventOrganizationAccess(req, res, db, ctx, organizationId, eventId);
  if (!hasAccess) return;

  try {
    const saved = await upsertEventQuestions(db, eventId, questions);
    res.status(200).json({ questions: saved });
  } catch (error) {
    logError("admin_event_questions_put_failed", { error, eventId, requestId: ctx.requestId });
    sendError(res, 500, ctx.requestId, "event_questions_update_failed", "Failed to update event questions");
  }
}
