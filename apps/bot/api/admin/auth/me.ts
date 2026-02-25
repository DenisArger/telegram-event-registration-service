import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, listUserOrganizations } from "@event/db";
import { applyCors } from "../../../src/cors.js";
import { getAdminPrincipal } from "../../../src/adminSession.js";
import { logError } from "@event/shared";
import { isAdminBypassEnabled } from "../../../src/adminApi.js";

const db = createServiceClient(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const bypassEnabled = isAdminBypassEnabled(process.env);
  const principal = bypassEnabled
    ? {
        userId: String(process.env.ADMIN_DEFAULT_CREATOR_ID ?? "").trim() || "bypass-admin",
        authUserId: "bypass-admin",
        role: "admin" as const,
        iat: 0,
        exp: Number.MAX_SAFE_INTEGER
      }
    : getAdminPrincipal(req, process.env);
  if (!principal) {
    res.status(401).json({ authenticated: false });
    return;
  }

  try {
    const organizations = await listUserOrganizations(db, principal.userId, {
      includeAllForAdmin: principal.role === "admin"
    });
    res.status(200).json({
      authenticated: true,
      role: principal.role,
      userId: principal.userId,
      authUserId: principal.authUserId,
      telegramId: principal.telegramId ?? null,
      organizations
    });
  } catch (error) {
    logError("admin_auth_me_failed", { error, userId: principal.userId });
    res.status(200).json({
      authenticated: true,
      role: principal.role,
      userId: principal.userId,
      authUserId: principal.authUserId,
      telegramId: principal.telegramId ?? null,
      organizations: []
    });
  }
}
