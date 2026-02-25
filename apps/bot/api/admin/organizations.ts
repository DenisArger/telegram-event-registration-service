import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createOrganization, createServiceClient, listUserOrganizations } from "@event/db";
import { logError } from "@event/shared";
import { z } from "zod";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { encryptSecret } from "../../src/crypto.js";

const db = createServiceClient(process.env);

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  telegramBotToken: z.string().trim().min(1).optional()
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;

  if (req.method === "GET") {
    try {
      const organizations = await listUserOrganizations(db, ctx.principal.userId, {
        includeAllForAdmin: ctx.principal.role === "admin"
      });
      res.status(200).json({ organizations, requestId: ctx.requestId });
    } catch (error) {
      logError("admin_organizations_list_failed", { error, requestId: ctx.requestId });
      sendError(res, 500, ctx.requestId, "organizations_load_failed", "Failed to load organizations");
    }
    return;
  }

  const parsed = createOrganizationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, ctx.requestId, "invalid_payload", parsed.error.issues[0]?.message ?? "Invalid payload");
    return;
  }

  try {
    const telegramBotTokenEncrypted = parsed.data.telegramBotToken
      ? encryptSecret(parsed.data.telegramBotToken, process.env)
      : null;

    const organization = await createOrganization(db, {
      name: parsed.data.name,
      ownerUserId: ctx.principal.userId,
      telegramBotTokenEncrypted
    });

    await db.from("organization_members").upsert({
      organization_id: organization.id,
      user_id: ctx.principal.userId,
      role: "owner"
    });

    res.status(201).json({ organization, requestId: ctx.requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (message === "missing_token_encryption_key" || message === "invalid_token_encryption_key") {
      sendError(res, 500, ctx.requestId, message, "TOKEN_ENCRYPTION_KEY is invalid or missing");
      return;
    }

    logError("admin_organization_create_failed", { error, requestId: ctx.requestId });
    sendError(res, 500, ctx.requestId, "organization_create_failed", "Failed to create organization");
  }
}
