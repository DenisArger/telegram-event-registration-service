import type { VercelRequest } from "@vercel/node";
import { loadEnv } from "@event/shared";

export function isAdminRequest(req: VercelRequest): boolean {
  const env = loadEnv(process.env);
  const allowed = env.ADMIN_EMAIL_ALLOWLIST.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const candidate = String(req.headers["x-admin-email"] ?? "").trim().toLowerCase();
  return Boolean(candidate) && allowed.includes(candidate);
}
