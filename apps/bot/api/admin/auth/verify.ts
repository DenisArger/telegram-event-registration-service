import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@event/db";
import { logError, type UserRole } from "@event/shared";
import { applyCors } from "../../../src/cors.js";
import { sendError } from "../../../src/adminApi.js";
import { setAdminSession } from "../../../src/adminSession.js";

interface VerifyPayload {
  email?: unknown;
  token?: unknown;
}

interface AdminUserRow {
  id: string;
  role: UserRole;
  telegram_id: number | null;
  auth_user_id: string | null;
  email: string | null;
}

const db = createServiceClient(process.env);
const OTP_VERIFY_TYPES: Array<"email" | "magiclink"> = ["email", "magiclink"];

function getAnonAuthClient(envSource: Record<string, string | undefined>) {
  const url = String(envSource.SUPABASE_URL ?? "").trim();
  const anonKey = String(envSource.SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function isAllowedRole(role: UserRole): boolean {
  return role === "admin" || role === "organizer";
}

async function findAdminUser(authUserId: string, email: string): Promise<AdminUserRow | null> {
  const byAuth = await db
    .from("users")
    .select("id,role,telegram_id,auth_user_id,email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (byAuth.error) throw byAuth.error;
  if (byAuth.data) return byAuth.data as AdminUserRow;

  const byEmail = await db
    .from("users")
    .select("id,role,telegram_id,auth_user_id,email")
    .eq("email", email)
    .maybeSingle();
  if (byEmail.error) throw byEmail.error;
  if (!byEmail.data) return null;

  const user = byEmail.data as AdminUserRow;
  if (user.auth_user_id && user.auth_user_id !== authUserId) return null;

  const linkResult = await db
    .from("users")
    .update({ auth_user_id: authUserId, email })
    .eq("id", user.id)
    .select("id,role,telegram_id,auth_user_id,email")
    .single();
  if (linkResult.error) throw linkResult.error;
  return linkResult.data as AdminUserRow;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secret = String(process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (!secret) {
    sendError(res, 500, "n/a", "session_secret_missing", "ADMIN_SESSION_SECRET is not configured");
    return;
  }

  const authClient = getAnonAuthClient(process.env);
  if (!authClient) {
    sendError(res, 500, "n/a", "supabase_auth_not_configured", "Supabase auth is not configured");
    return;
  }

  const email = String((req.body as VerifyPayload | undefined)?.email ?? "").trim().toLowerCase();
  const token = String((req.body as VerifyPayload | undefined)?.token ?? "").trim();
  if (!email || !email.includes("@") || !token) {
    sendError(res, 400, "n/a", "invalid_payload", "email and token are required");
    return;
  }

  try {
    let authUserId: string | null = null;

    for (const type of OTP_VERIFY_TYPES) {
      const verifyResult = await authClient.auth.verifyOtp({
        email,
        token,
        type
      });
      if (!verifyResult.error && verifyResult.data.user?.id) {
        authUserId = verifyResult.data.user.id;
        break;
      }
    }

    if (!authUserId) {
      sendError(res, 401, "n/a", "otp_verify_failed", "otp_verify_failed");
      return;
    }

    const user = await findAdminUser(authUserId, email);
    if (!user) {
      sendError(res, 403, "n/a", "admin_user_not_found", "admin_user_not_found");
      return;
    }
    if (!isAllowedRole(user.role)) {
      sendError(res, 403, "n/a", "insufficient_role", "insufficient_role");
      return;
    }

    setAdminSession(
      res,
      {
        userId: user.id,
        authUserId,
        telegramId: user.telegram_id ?? undefined,
        role: user.role
      },
      process.env
    );

    res.status(200).json({
      ok: true,
      role: user.role,
      userId: user.id,
      authUserId
    });
  } catch (error) {
    logError("admin_auth_verify_failed", { error, email });
    sendError(res, 500, "n/a", "admin_auth_failed", "Failed to verify email auth");
  }
}
