import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, transferOrganizationOwnership } from "@event/db";
import { logError } from "@event/shared";
import { z } from "zod";
import { requireAdminSession, sendError } from "../../src/adminApi.js";
import { applyCors } from "../../src/cors.js";
import { requireOrganizationAccess } from "../../src/adminOrgAccess.js";

const db = createServiceClient(process.env);

const transferSchema = z.object({
  organizationId: z.string().trim().uuid(),
  newOwnerUserId: z.string().trim().uuid()
});

function parseKnownTransferError(error: unknown): { status: number; code: string; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes("owner_transfer_same_user")) {
    return { status: 400, code: "invalid_payload", message: "newOwnerUserId must be different from current owner" };
  }
  if (error.message.includes("owner_transfer_forbidden")) {
    return { status: 403, code: "forbidden", message: "Only current owner can transfer ownership" };
  }
  if (error.message.includes("owner_transfer_target_not_member")) {
    return { status: 404, code: "organization_member_not_found", message: "Target user is not organization member" };
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const ctx = requireAdminSession(req, res, process.env);
  if (!ctx) return;

  const parsed = transferSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, ctx.requestId, "invalid_payload", parsed.error.issues[0]?.message ?? "Invalid payload");
    return;
  }

  const hasAccess = await requireOrganizationAccess(req, res, db, ctx, parsed.data.organizationId);
  if (!hasAccess) return;

  try {
    const transfer = await transferOrganizationOwnership(db, {
      organizationId: parsed.data.organizationId,
      currentOwnerUserId: ctx.principal.userId,
      newOwnerUserId: parsed.data.newOwnerUserId
    });
    res.status(200).json({ transfer });
  } catch (error) {
    const known = parseKnownTransferError(error);
    if (known) {
      sendError(res, known.status, ctx.requestId, known.code, known.message);
      return;
    }

    logError("admin_organization_owner_transfer_failed", {
      error,
      requestId: ctx.requestId,
      organizationId: parsed.data.organizationId,
      actorUserId: ctx.principal.userId,
      newOwnerUserId: parsed.data.newOwnerUserId
    });
    sendError(res, 500, ctx.requestId, "organization_owner_transfer_failed", "Failed to transfer organization ownership");
  }
}
