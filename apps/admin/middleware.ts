import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isAdminBypassEnabled(): boolean {
  return String(process.env.ADMIN_BYPASS_AUTH ?? "").trim().toLowerCase() === "true";
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  if (isAdminBypassEnabled()) return true;

  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return false;

  const apiBase = process.env.ADMIN_API_BASE_URL || req.nextUrl.origin;
  try {
    const response = await fetch(`${apiBase}/api/admin/auth/me`, {
      method: "GET",
      headers: { cookie: cookieHeader },
      cache: "no-store"
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isAdminBypassEnabled()) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  const validSession = await hasValidSession(req);

  if (pathname === "/login") {
    if (validSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!validSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"]
};
