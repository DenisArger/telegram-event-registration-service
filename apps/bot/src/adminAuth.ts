import type { VercelRequest } from "@vercel/node";
import { loadEnv } from "@event/shared";
import { getAdminPrincipal } from "./adminSession.js";

function isEmailFallbackEnabled(envSource: Record<string, string | undefined>): boolean {
  return String(envSource.ADMIN_AUTH_ALLOW_EMAIL_FALLBACK ?? "true").trim().toLowerCase() !== "false";
}

function isAllowedByHeaderFallback(req: VercelRequest): boolean {
  const env = loadEnv(process.env);
  const allowed = env.ADMIN_EMAIL_ALLOWLIST.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const candidate = String(req.headers["x-admin-email"] ?? "").trim().toLowerCase();
  return Boolean(candidate) && allowed.includes(candidate);
}

export function isAdminRequest(req: VercelRequest): boolean {
  const principal = getAdminPrincipal(req, process.env);
  if (principal && (principal.role === "admin" || principal.role === "organizer")) {
    return true;
  }

  if (!isEmailFallbackEnabled(process.env)) return false;
  return isAllowedByHeaderFallback(req);
}
