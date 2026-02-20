import crypto from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE_NAME = "admin_session";

type AdminRole = "admin" | "organizer";

interface Principal {
  userId: string;
  telegramId: number;
  role: AdminRole;
  iat: number;
  exp: number;
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    out[name] = rest.join("=");
  }
  return out;
}

function getCookieSameSite(env: Record<string, string | undefined>): "Lax" | "Strict" | "None" {
  const raw = String(env.ADMIN_SESSION_COOKIE_SAMESITE ?? "Lax").trim().toLowerCase();
  if (raw === "none") return "None";
  if (raw === "strict") return "Strict";
  return "Lax";
}

function getSessionSecret(env: Record<string, string | undefined>): string {
  return String(env.ADMIN_SESSION_SECRET ?? "").trim();
}

function getTtl(env: Record<string, string | undefined>): number {
  const parsed = Number(env.ADMIN_SESSION_TTL_SECONDS ?? "28800");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 28800;
}

function createToken(payload: Principal, secret: string): string {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = toBase64Url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${signature}`;
}

function verifyToken(token: string, secret: string): Principal | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = toBase64Url(crypto.createHmac("sha256", secret).update(body).digest());
  if (!safeEqual(expected, signature)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(body).toString("utf8")) as Principal;
    if (!parsed.userId || !Number.isInteger(parsed.telegramId)) return null;
    if (parsed.role !== "admin" && parsed.role !== "organizer") return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readPrincipal(req: NextApiRequest): Principal | null {
  const secret = getSessionSecret(process.env);
  if (!secret) return null;
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token, secret);
}

export function writeSession(
  res: NextApiResponse,
  payload: { userId: string; telegramId: number; role: AdminRole }
): void {
  const secret = getSessionSecret(process.env);
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");

  const ttl = getTtl(process.env);
  const now = Math.floor(Date.now() / 1000);
  const token = createToken(
    {
      userId: payload.userId,
      telegramId: payload.telegramId,
      role: payload.role,
      iat: now,
      exp: now + ttl
    },
    secret
  );

  const sameSite = getCookieSameSite(process.env);
  const isSecure = sameSite === "None" || process.env.NODE_ENV === "production";
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${ttl}`,
    isSecure ? "Secure" : ""
  ].filter(Boolean).join("; ");
  res.setHeader("set-cookie", cookie);
}

export function clearSession(res: NextApiResponse): void {
  const sameSite = getCookieSameSite(process.env);
  const isSecure = sameSite === "None" || process.env.NODE_ENV === "production";
  const cookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=0",
    isSecure ? "Secure" : ""
  ].filter(Boolean).join("; ");
  res.setHeader("set-cookie", cookie);
}
