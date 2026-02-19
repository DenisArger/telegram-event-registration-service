import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, listEventQuestions, upsertEventQuestions } from "@event/db";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";
import { applyCors } from "../../src/cors.js";

const db = createServiceClient(process.env);

function normalizeQuestions(raw: any): Array<{ id?: string; prompt: string; isRequired: boolean; position: number }> {
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
      const questions = await listEventQuestions(db, eventId);
      res.status(200).json({ questions });
    } catch (error) {
      logError("admin_event_questions_get_failed", { error, eventId });
      res.status(500).json({ message: "Failed to load event questions" });
    }
    return;
  }

  const eventId = String(req.body?.eventId ?? "").trim();
  if (!eventId) {
    res.status(400).json({ message: "eventId is required" });
    return;
  }

  let questions: Array<{ id?: string; prompt: string; isRequired: boolean; position: number }>;
  try {
    questions = normalizeQuestions(req.body?.questions);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Invalid questions" });
    return;
  }

  try {
    const saved = await upsertEventQuestions(db, eventId, questions);
    res.status(200).json({ questions: saved });
  } catch (error) {
    logError("admin_event_questions_put_failed", { error, eventId });
    res.status(500).json({ message: "Failed to update event questions" });
  }
}
