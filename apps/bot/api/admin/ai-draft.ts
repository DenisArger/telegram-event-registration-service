import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logError } from "@event/shared";
import { isAdminRequest } from "../../src/adminAuth.js";
import { generateAnnouncementWithAi } from "../../src/aiDraft.js";
import { applyCors } from "../../src/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const title = String(req.body?.title ?? "").trim();
  const startsAt = String(req.body?.startsAt ?? "").trim();
  const location = String(req.body?.location ?? "").trim();
  const description = String(req.body?.description ?? "").trim();
  const locale = String(req.body?.locale ?? "").trim().toLowerCase();
  const tone = String(req.body?.tone ?? "").trim().toLowerCase();

  if (!title) {
    res.status(400).json({ message: "title is required" });
    return;
  }

  if (title.length > 300) {
    res.status(400).json({ message: "title is too long" });
    return;
  }

  if (description.length > 4000) {
    res.status(400).json({ message: "description is too long" });
    return;
  }

  try {
    const result = await generateAnnouncementWithAi(
      {
        title,
        startsAt: startsAt || null,
        location: location || null,
        description: description || null,
        locale: locale === "ru" ? "ru" : "en",
        tone: tone === "formal" || tone === "concise" ? tone : "friendly"
      },
      process.env
    );

    res.status(200).json({
      draft: result.text,
      provider: result.provider,
      model: result.model
    });
  } catch (error) {
    logError("admin_ai_draft_failed", { error });
    const message = error instanceof Error ? error.message : "unknown_error";
    if (
      message === "missing_ai_api_key" ||
      message === "missing_deepseek_api_key" ||
      message === "missing_vedai_api_key" ||
      message === "missing_yandex_auth" ||
      message === "missing_yandex_model_uri" ||
      message === "unsupported_ai_provider" ||
      message.startsWith("ai_provider_http_")
    ) {
      res.status(502).json({ message });
      return;
    }
    res.status(500).json({ message: "Failed to generate AI draft" });
  }
}
