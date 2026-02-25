import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { UserRole } from "@event/shared";

export const ADMIN_SESSION_COOKIE = "admin_session";

export interface AdminPrincipal {
  userId: string;
  authUserId: string;
  telegramId?: number;
  role: UserRole;
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

function parseCookieHeader(value: string | undefined): Record<string, string> {
  if (!value) return {};
  const out: Record<string, string> = {};
  for (const chunk of value.split(";")) {
    const [name, ...rest] = chunk.trim().split("=");
    if (!name) continue;
    out[name] = rest.join("=");
  }
  return out;
}

function parsePositiveInt(input: string | undefined, fallbackValue: number): number {
  const num = Number(input ?? "");
  if (!Number.isFinite(num) || num <= 0) return fallbackValue;
  return Math.floor(num);
}

function getCookieSameSite(envSource: Record<string, string | undefined>): "Lax" | "Strict" | "None" {
  const raw = String(envSource.ADMIN_SESSION_COOKIE_SAMESITE ?? "Lax").trim().toLowerCase();
  if (raw === "none") return "None";
  if (raw === "strict") return "Strict";
  return "Lax";
}

export function createSessionToken(payload: AdminPrincipal, secret: string): string {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = toBase64Url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  nowMs = Date.now()
): AdminPrincipal | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = toBase64Url(crypto.createHmac("sha256", secret).update(body).digest());
  if (!safeEqual(expected, signature)) return null;

  let parsed: AdminPrincipal;
  try {
    parsed = JSON.parse(fromBase64Url(body).toString("utf8")) as AdminPrincipal;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.userId || typeof parsed.userId !== "string") return null;
  if (!parsed.authUserId || typeof parsed.authUserId !== "string") return null;
  if (parsed.telegramId !== undefined && (!Number.isInteger(parsed.telegramId) || parsed.telegramId <= 0)) {
    return null;
  }
  if (parsed.role !== "admin" && parsed.role !== "organizer") return null;
  if (!Number.isInteger(parsed.iat) || !Number.isInteger(parsed.exp)) return null;
  if (parsed.exp <= Math.floor(nowMs / 1000)) return null;

  return parsed;
}

export function getSessionSecret(envSource: Record<string, string | undefined>): string {
  return String(envSource.ADMIN_SESSION_SECRET ?? "").trim();
}

export function getSessionTtlSeconds(envSource: Record<string, string | undefined>): number {
  return parsePositiveInt(envSource.ADMIN_SESSION_TTL_SECONDS, 8 * 60 * 60);
}

export function getAdminPrincipal(req: VercelRequest, envSource: Record<string, string | undefined>): AdminPrincipal | null {
  const secret = getSessionSecret(envSource);
  if (!secret) return null;

  const cookieHeader = req.headers.cookie;
  const cookieValue = parseCookieHeader(cookieHeader)[ADMIN_SESSION_COOKIE];
  if (!cookieValue) return null;
  return verifySessionToken(cookieValue, secret);
}

export function setAdminSession(
  res: VercelResponse,
  payload: { userId: string; authUserId: string; role: UserRole; telegramId?: number },
  envSource: Record<string, string | undefined>,
  nowMs = Date.now()
): AdminPrincipal {
  const ttl = getSessionTtlSeconds(envSource);
  const iat = Math.floor(nowMs / 1000);
  const principal: AdminPrincipal = {
    userId: payload.userId,
    authUserId: payload.authUserId,
    telegramId: payload.telegramId,
    role: payload.role,
    iat,
    exp: iat + ttl
  };

  const token = createSessionToken(principal, getSessionSecret(envSource));
  const sameSite = getCookieSameSite(envSource);
  const isSecure = sameSite === "None" || envSource.NODE_ENV === "production";
  const cookie = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${ttl}`,
    isSecure ? "Secure" : ""
  ].filter(Boolean).join("; ");
  res.setHeader("set-cookie", cookie);
  return principal;
}

export function clearAdminSession(res: VercelResponse, envSource: Record<string, string | undefined>): void {
  const sameSite = getCookieSameSite(envSource);
  const isSecure = sameSite === "None" || envSource.NODE_ENV === "production";
  const cookie = [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=0",
    isSecure ? "Secure" : ""
  ].filter(Boolean).join("; ");
  res.setHeader("set-cookie", cookie);
}
