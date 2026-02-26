import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, getOrganizationTelegramBotTokenEncrypted, getUserByTelegramId } from "@event/db";
import { logError } from "@event/shared";
import { applyCors } from "../../../src/cors.js";
import { setAdminSession } from "../../../src/adminSession.js";
import { verifyTelegramLoginPayload } from "../../../src/adminTelegramAuth.js";
import { sendError } from "../../../src/adminApi.js";
import { readOrganizationId } from "../../../src/adminOrgAccess.js";
import { decryptSecret } from "../../../src/crypto.js";

const db = createServiceClient(process.env);

function isTelegramAuthEnabled(): boolean {
  return String(process.env.ADMIN_AUTH_TELEGRAM_ENABLED ?? "true").trim().toLowerCase() !== "false";
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isTelegramAuthEnabled()) {
    sendError(res, 403, "n/a", "telegram_auth_disabled", "telegram_auth_disabled");
    return;
  }

  const secret = String(process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (!secret) {
    sendError(res, 500, "n/a", "session_secret_missing", "ADMIN_SESSION_SECRET is not configured");
    return;
  }

  let botTokenOverride: string | undefined;
  const organizationId = readOrganizationId(req) || undefined;
  if (organizationId) {
    try {
      const encryptedToken = await getOrganizationTelegramBotTokenEncrypted(db, organizationId);
      if (encryptedToken) {
        botTokenOverride = decryptSecret(encryptedToken, process.env);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (
        message === "missing_token_encryption_key" ||
        message === "invalid_token_encryption_key" ||
        message === "invalid_encrypted_secret"
      ) {
        sendError(res, 500, "n/a", message, "TOKEN_ENCRYPTION_KEY is invalid or missing");
        return;
      }
      logError("admin_auth_telegram_org_token_load_failed", { error, organizationId });
      sendError(res, 500, "n/a", "admin_auth_failed", "Failed to authorize admin");
      return;
    }
  }

  const verification = verifyTelegramLoginPayload(req.body, process.env, Date.now(), botTokenOverride);
  if (!verification.ok) {
    sendError(res, 401, "n/a", "unauthorized", verification.error ?? "Unauthorized");
    return;
  }

  try {
    const user = await getUserByTelegramId(db, verification.payload!.id);
    if (!user) {
      sendError(res, 403, "n/a", "admin_user_not_found", "admin_user_not_found");
      return;
    }
    if (user.role !== "admin" && user.role !== "organizer") {
      sendError(res, 403, "n/a", "insufficient_role", "insufficient_role");
      return;
    }

    setAdminSession(
      res,
      { userId: user.id, authUserId: user.id, telegramId: user.telegramId, role: user.role },
      process.env
    );

    res.status(200).json({
      ok: true,
      role: user.role,
      userId: user.id
    });
  } catch (error) {
    logError("admin_auth_telegram_failed", { error });
    sendError(res, 500, "n/a", "admin_auth_failed", "Failed to authorize admin");
  }
}
