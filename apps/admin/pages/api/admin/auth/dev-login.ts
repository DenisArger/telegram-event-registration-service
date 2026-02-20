import type { NextApiRequest, NextApiResponse } from "next";
import { clearSession, writeSession } from "../../../../lib/admin-session";

interface AdminUser {
  id: string;
  role: "participant" | "organizer" | "admin";
  telegram_id: number;
}

function applyCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = String(req.headers.origin ?? "").trim();
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
  }
  res.setHeader("access-control-allow-methods", "POST,OPTIONS");
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", "content-type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (String(process.env.ADMIN_UNSAFE_LOGIN_ENABLED ?? "false").trim().toLowerCase() !== "true") {
    res.status(403).json({ message: "unsafe_login_disabled" });
    return;
  }

  const telegramId = Number(String(req.body?.telegramId ?? "").trim());
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    res.status(400).json({ message: "telegramId must be a positive integer" });
    return;
  }

  try {
    const supabaseUrl = String(process.env.SUPABASE_URL ?? "").trim();
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
    if (!supabaseUrl || !serviceKey) {
      res.status(500).json({ message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required" });
      return;
    }

    const usersUrl = new URL(`${supabaseUrl}/rest/v1/users`);
    usersUrl.searchParams.set("select", "id,role,telegram_id");
    usersUrl.searchParams.set("telegram_id", `eq.${telegramId}`);
    usersUrl.searchParams.set("limit", "1");

    const response = await fetch(usersUrl.toString(), {
      method: "GET",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`
      }
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      res.status(500).json({ message: `Failed to load user from Supabase: ${response.status} ${body}` });
      return;
    }

    const rows = (await response.json()) as AdminUser[];
    const user = rows[0];
    if (!user) {
      res.status(403).json({ message: "admin_user_not_found" });
      return;
    }
    if (user.role !== "admin" && user.role !== "organizer") {
      res.status(403).json({ message: "insufficient_role" });
      return;
    }

    writeSession(res, {
      userId: user.id,
      telegramId: Number(user.telegram_id),
      role: user.role
    });
    res.status(200).json({ ok: true, role: user.role, userId: user.id });
  } catch (error) {
    clearSession(res);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to authorize admin" });
  }
}
