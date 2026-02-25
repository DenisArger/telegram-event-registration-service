import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminPrincipal, type AdminPrincipal } from "./adminSession.js";

export interface AdminRequestContext {
  requestId: string;
  principal: AdminPrincipal;
}

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

export function isEmailFallbackEnabled(envSource: Record<string, string | undefined>): boolean {
  return boolFromEnv(envSource.ADMIN_AUTH_ALLOW_EMAIL_FALLBACK, true);
}

export function isOrganizationContextRequired(envSource: Record<string, string | undefined>): boolean {
  return boolFromEnv(envSource.ADMIN_REQUIRE_ORG_CONTEXT, false);
}

export function createRequestId(req: VercelRequest): string {
  const incoming = String(req.headers["x-request-id"] ?? "").trim();
  if (incoming) return incoming;
  return crypto.randomUUID();
}

export function sendError(
  res: VercelResponse,
  status: number,
  requestId: string,
  code: string,
  message: string
): void {
  const legacyMode = !isOrganizationContextRequired(process.env);
  if (legacyMode) {
    res.status(status).json({ message });
    return;
  }

  res.status(status).json({ code, message, requestId });
}

function isAllowedByHeaderFallback(
  req: VercelRequest,
  envSource: Record<string, string | undefined>
): boolean {
  const allowed = String(envSource.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const candidate = String(req.headers["x-admin-email"] ?? "").trim().toLowerCase();
  return Boolean(candidate) && allowed.includes(candidate);
}

export function requireAdminSession(
  req: VercelRequest,
  res: VercelResponse,
  envSource: Record<string, string | undefined>
): AdminRequestContext | null {
  const requestId = createRequestId(req);
  res.setHeader("x-request-id", requestId);

  const principal = getAdminPrincipal(req, envSource);
  if (!principal) {
    if (isEmailFallbackEnabled(envSource) && isAllowedByHeaderFallback(req, envSource)) {
      const fallbackPrincipal: AdminPrincipal = {
        userId: String(envSource.ADMIN_DEFAULT_CREATOR_ID ?? "").trim() || "legacy-email-fallback",
        authUserId: "legacy-email-fallback",
        role: "admin",
        iat: 0,
        exp: Number.MAX_SAFE_INTEGER
      };
      return { requestId, principal: fallbackPrincipal };
    }

    sendError(res, 401, requestId, "unauthorized", "Unauthorized");
    return null;
  }

  return { requestId, principal };
}
