import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getOrganizationTelegramBotTokenEncrypted } from "@event/db";
import { logError } from "@event/shared";
import { z } from "zod";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { requireOrganizationAccess } from "../../src/adminOrgAccess.js";
import { applyCors } from "../../src/cors.js";
import { decryptSecret } from "../../src/crypto.js";

const db = createServiceClient(process.env);

const payloadSchema = z.object({
  organizationId: z.string().trim().uuid()
});

function resolveWebhookBaseUrl(envSource: Record<string, string | undefined>): string {
  const explicit = String(envSource.TELEGRAM_WEBHOOK_BASE_URL ?? "").trim();
  if (explicit) return explicit;

  const vercelUrl = String(envSource.VERCEL_URL ?? "").trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  throw new Error("missing_webhook_base_url");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;

  const parsed = payloadSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, ctx.requestId, "invalid_payload", parsed.error.issues[0]?.message ?? "Invalid payload");
    return;
  }

  const organizationId = parsed.data.organizationId;
  const hasAccess = await requireOrganizationAccess(req, res, db, ctx, organizationId);
  if (!hasAccess) return;

  try {
    const encrypted = await getOrganizationTelegramBotTokenEncrypted(db, organizationId);
    if (!encrypted) {
      sendError(res, 400, ctx.requestId, "organization_bot_token_missing", "Organization bot token is not set");
      return;
    }

    const botToken = decryptSecret(encrypted, process.env);
    const webhookBase = resolveWebhookBaseUrl(process.env);
    const webhookUrl = new URL("/api/telegram/webhook", webhookBase);
    webhookUrl.searchParams.set("organizationId", organizationId);

    const secretToken = String(process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
    if (!secretToken) {
      sendError(res, 500, ctx.requestId, "webhook_secret_missing", "TELEGRAM_WEBHOOK_SECRET is not configured");
      return;
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        url: webhookUrl.toString(),
        secret_token: secretToken,
        allowed_updates: ["message", "callback_query"]
      })
    });

    const tgBody = await tgResponse.json().catch(() => ({}));
    if (!tgResponse.ok || tgBody?.ok !== true) {
      sendError(
        res,
        502,
        ctx.requestId,
        "telegram_set_webhook_failed",
        String(tgBody?.description ?? "Failed to register Telegram webhook")
      );
      return;
    }

    res.status(200).json({
      ok: true,
      organizationId,
      webhookUrl: webhookUrl.toString(),
      requestId: ctx.requestId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (
      message === "missing_token_encryption_key" ||
      message === "invalid_token_encryption_key" ||
      message === "invalid_encrypted_secret"
    ) {
      sendError(res, 500, ctx.requestId, message, "TOKEN_ENCRYPTION_KEY is invalid or missing");
      return;
    }
    if (message === "missing_webhook_base_url") {
      sendError(res, 500, ctx.requestId, message, "TELEGRAM_WEBHOOK_BASE_URL or VERCEL_URL is required");
      return;
    }

    logError("admin_organization_webhook_register_failed", { error, requestId: ctx.requestId, organizationId });
    sendError(res, 500, ctx.requestId, "organization_webhook_register_failed", "Failed to register organization webhook");
  }
}
