import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createServiceClient,
  listOrganizationMembers,
  removeOrganizationMember,
  upsertOrganizationMember
} from "@event/db";
import { logError } from "@event/shared";
import { z } from "zod";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { readOrganizationId, requireOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);

const memberSchema = z.object({
  organizationId: z.string().trim().uuid(),
  userId: z.string().trim().uuid(),
  role: z.enum(["owner", "admin"])
});

function readUserId(req: VercelRequest): string {
  const fromBody = String((req.body as any)?.userId ?? "").trim();
  if (fromBody) return fromBody;
  const raw = req.query?.userId;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function isLastOwnerViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("last_owner_violation");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method ?? "")) {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;

  if (req.method === "GET") {
    const organizationId = readOrganizationId(req);
    if (!organizationId) {
      sendError(res, 400, ctx.requestId, "organization_required", "organizationId is required");
      return;
    }

    const hasAccess = await requireOrganizationAccess(req, res, db, ctx, organizationId);
    if (!hasAccess) return;

    try {
      const members = await listOrganizationMembers(db, organizationId);
      res.status(200).json({ members });
    } catch (error) {
      logError("admin_organization_members_list_failed", { error, requestId: ctx.requestId, organizationId });
      sendError(res, 500, ctx.requestId, "organization_members_load_failed", "Failed to load organization members");
    }
    return;
  }

  if (req.method === "DELETE") {
    const organizationId = readOrganizationId(req);
    const userId = readUserId(req);
    if (!organizationId) {
      sendError(res, 400, ctx.requestId, "organization_required", "organizationId is required");
      return;
    }
    if (!userId) {
      sendError(res, 400, ctx.requestId, "user_required", "userId is required");
      return;
    }

    const hasAccess = await requireOrganizationAccess(req, res, db, ctx, organizationId);
    if (!hasAccess) return;

    try {
      const removed = await removeOrganizationMember(db, organizationId, userId);
      if (!removed) {
        sendError(res, 404, ctx.requestId, "organization_member_not_found", "Organization member not found");
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      if (isLastOwnerViolation(error)) {
        sendError(res, 409, ctx.requestId, "last_owner_violation", "Cannot remove the last owner");
        return;
      }
      logError("admin_organization_member_delete_failed", { error, requestId: ctx.requestId, organizationId, userId });
      sendError(res, 500, ctx.requestId, "organization_member_delete_failed", "Failed to delete organization member");
    }
    return;
  }

  const parsed = memberSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, ctx.requestId, "invalid_payload", parsed.error.issues[0]?.message ?? "Invalid payload");
    return;
  }

  const hasAccess = await requireOrganizationAccess(req, res, db, ctx, parsed.data.organizationId);
  if (!hasAccess) return;

  try {
    const member = await upsertOrganizationMember(db, parsed.data);
    res.status(req.method === "POST" ? 201 : 200).json({ member });
  } catch (error) {
    if (isLastOwnerViolation(error)) {
      sendError(res, 409, ctx.requestId, "last_owner_violation", "Cannot demote the last owner");
      return;
    }
    logError("admin_organization_member_upsert_failed", {
      error,
      requestId: ctx.requestId,
      organizationId: parsed.data.organizationId,
      userId: parsed.data.userId
    });
    sendError(res, 500, ctx.requestId, "organization_member_upsert_failed", "Failed to save organization member");
  }
}
