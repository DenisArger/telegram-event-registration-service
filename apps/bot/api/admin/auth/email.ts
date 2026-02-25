import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@event/shared";
import { applyCors } from "../../../src/cors.js";
import { sendError } from "../../../src/adminApi.js";

interface EmailAuthPayload {
  email?: unknown;
}

function getAnonAuthClient(envSource: Record<string, string | undefined>) {
  const url = String(envSource.SUPABASE_URL ?? "").trim();
  const anonKey = String(envSource.SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authClient = getAnonAuthClient(process.env);
  if (!authClient) {
    sendError(res, 500, "n/a", "supabase_auth_not_configured", "Supabase auth is not configured");
    return;
  }

  const email = String((req.body as EmailAuthPayload | undefined)?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    sendError(res, 400, "n/a", "invalid_payload", "email must be valid");
    return;
  }

  try {
    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });

    if (error) {
      const errorCode = (error as { code?: string } | null)?.code ?? null;
      const errorStatus = (error as { status?: number } | null)?.status ?? null;
      logError("admin_auth_email_otp_send_failed", {
        email,
        code: errorCode,
        message: (error as { message?: string } | null)?.message ?? null,
        status: errorStatus
      });
      if (errorCode === "over_email_send_rate_limit" || errorStatus === 429) {
        sendError(
          res,
          429,
          "n/a",
          "over_email_send_rate_limit",
          "Too many OTP requests. Please wait a few minutes and try again."
        );
        return;
      }
      sendError(res, 401, "n/a", "otp_send_failed", "otp_send_failed");
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    logError("admin_auth_email_failed", { error, email });
    sendError(res, 500, "n/a", "admin_auth_failed", "Failed to start email auth");
  }
}
