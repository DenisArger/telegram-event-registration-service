import type { SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertEventInOrg, assertUserOrganizationAccess } from "@event/db";
import { isOrganizationContextRequired, sendError } from "./adminApi.js";
import type { AdminRequestContext } from "./adminApi.js";

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export function readOrganizationId(req: VercelRequest): string {
  const fromBody = normalize((req.body as any)?.organizationId);
  if (fromBody) return fromBody;

  const fromQuery = req.query?.organizationId;
  if (Array.isArray(fromQuery)) return normalize(fromQuery[0]);
  return normalize(fromQuery);
}

export function readEventId(req: VercelRequest): string {
  const fromBody = normalize((req.body as any)?.eventId);
  if (fromBody) return fromBody;

  const fromQuery = req.query?.eventId;
  if (Array.isArray(fromQuery)) return normalize(fromQuery[0]);
  return normalize(fromQuery);
}

export async function requireOrganizationAccess(
  _req: VercelRequest,
  res: VercelResponse,
  db: SupabaseClient,
  ctx: AdminRequestContext,
  organizationId?: string
): Promise<boolean> {
  const strictMode = isOrganizationContextRequired(process.env);

  if (!organizationId) {
    if (strictMode) {
      sendError(res, 400, ctx.requestId, "organization_required", "organizationId is required");
      return false;
    }

    return true;
  }

  if (ctx.principal.userId === "legacy-email-fallback") {
    return true;
  }

  const hasAccess = await assertUserOrganizationAccess(db, ctx.principal.userId, organizationId);
  if (!hasAccess) {
    sendError(res, 403, ctx.requestId, "forbidden", "No access to organization");
    return false;
  }
  return true;
}

export async function requireEventOrganizationAccess(
  _req: VercelRequest,
  res: VercelResponse,
  db: SupabaseClient,
  ctx: AdminRequestContext,
  organizationId: string | undefined,
  eventId: string
): Promise<boolean> {
  const strictMode = isOrganizationContextRequired(process.env);
  if (!organizationId) {
    if (strictMode) {
      sendError(res, 400, ctx.requestId, "organization_required", "organizationId is required");
      return false;
    }

    return true;
  }

  if (ctx.principal.userId !== "legacy-email-fallback") {
    const hasOrgAccess = await requireOrganizationAccess(_req, res, db, ctx, organizationId);
    if (!hasOrgAccess) return false;
  }

  const inOrg = await assertEventInOrg(db, eventId, organizationId);
  if (!inOrg) {
    sendError(res, 404, ctx.requestId, "event_not_found", "Event not found in organization scope");
    return false;
  }

  return true;
}
