import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createOrganization, createServiceClient, listUserOrganizations, updateOrganization } from "@event/db";
import { logError } from "@event/shared";
import { z } from "zod";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { requireOrganizationAccess } from "../../src/adminOrgAccess.js";
import { applyCors } from "../../src/cors.js";
import { encryptSecret } from "../../src/crypto.js";

const db = createServiceClient(process.env);

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  telegramBotToken: z.string().trim().min(1).optional()
});

const updateOrganizationSchema = z.object({
  organizationId: z.string().trim().uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  telegramBotToken: z.string().trim().min(1).nullable().optional()
}).refine((value) => value.name !== undefined || value.telegramBotToken !== undefined, {
  message: "at least one field must be provided"
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT") {
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

  if (req.method === "PUT") {
    const parsedUpdate = updateOrganizationSchema.safeParse(req.body ?? {});
    if (!parsedUpdate.success) {
      sendError(res, 400, ctx.requestId, "invalid_payload", parsedUpdate.error.issues[0]?.message ?? "Invalid payload");
      return;
    }

    const hasAccess = await requireOrganizationAccess(req, res, db, ctx, parsedUpdate.data.organizationId);
    if (!hasAccess) return;

    try {
      const telegramBotTokenEncrypted = parsedUpdate.data.telegramBotToken === undefined
        ? undefined
        : parsedUpdate.data.telegramBotToken === null
          ? null
          : encryptSecret(parsedUpdate.data.telegramBotToken, process.env);

      const organization = await updateOrganization(db, {
        organizationId: parsedUpdate.data.organizationId,
        name: parsedUpdate.data.name,
        telegramBotTokenEncrypted
      });
      if (!organization) {
        sendError(res, 404, ctx.requestId, "organization_not_found", "Organization not found");
        return;
      }

      res.status(200).json({ organization, requestId: ctx.requestId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (message === "missing_token_encryption_key" || message === "invalid_token_encryption_key") {
        sendError(res, 500, ctx.requestId, message, "TOKEN_ENCRYPTION_KEY is invalid or missing");
        return;
      }
      logError("admin_organization_update_failed", { error, requestId: ctx.requestId });
      sendError(res, 500, ctx.requestId, "organization_update_failed", "Failed to update organization");
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
