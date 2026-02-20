export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string | null;
  endsAt?: string | null;
  status: "draft" | "published" | "closed";
  capacity: number | null;
  registrationSuccessMessage?: string | null;
}

export interface AttendeeItem {
  userId: string;
  fullName: string;
  username: string | null;
  telegramId?: number | null;
  displayOrder: number | null;
  rowColor: string | null;
  status: "registered" | "cancelled";
  paymentStatus?: "mock_pending" | "mock_paid";
  registeredAt: string;
  checkedIn: boolean;
  answers?: Array<{
    questionId: string;
    questionVersion: number;
    prompt: string;
    answerText: string | null;
    isSkipped: boolean;
    createdAt: string;
  }>;
}

export interface WaitlistItem {
  userId: string;
  fullName: string;
  username: string | null;
  position: number;
}

export interface EventStats {
  registeredCount: number;
  checkedInCount: number;
  waitlistCount: number;
  noShowRate: number;
}

function getAdminConfig(): { base: string } | null {
  const base = process.env.ADMIN_API_BASE_URL;
  if (!base) return null;
  return { base };
}

async function getServerCookieHeader(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const serialized = cookieStore.toString();
    return serialized || null;
  } catch {
    return null;
  }
}

export async function getHealth(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_BOT_HEALTH_URL;
  if (!url) return "unknown (NEXT_PUBLIC_BOT_HEALTH_URL not set)";

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return `down (${response.status})`;
    return "ok";
  } catch {
    return "down (network error)";
  }
}

export async function getAdminEvents(): Promise<EventItem[]> {
  const cfg = getAdminConfig();
  if (!cfg) return [];
  const cookieHeader = await getServerCookieHeader();

  try {
    const response = await fetch(`${cfg.base}/api/admin/events`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { events?: EventItem[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

export async function getAdminEventById(eventId: string): Promise<EventItem | null> {
  const cfg = getAdminConfig();
  if (!cfg) return null;
  const cookieHeader = await getServerCookieHeader();

  try {
    const response = await fetch(`${cfg.base}/api/admin/events?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const data = (await response.json()) as { event?: EventItem };
    return data.event ?? null;
  } catch {
    return null;
  }
}

export async function getAttendees(eventId: string): Promise<AttendeeItem[]> {
  const cfg = getAdminConfig();
  if (!cfg) return [];
  const cookieHeader = await getServerCookieHeader();

  try {
    const response = await fetch(`${cfg.base}/api/admin/attendees?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { attendees?: AttendeeItem[] };
    return data.attendees ?? [];
  } catch {
    return [];
  }
}

export async function getWaitlist(eventId: string): Promise<WaitlistItem[]> {
  const cfg = getAdminConfig();
  if (!cfg) return [];
  const cookieHeader = await getServerCookieHeader();

  try {
    const response = await fetch(`${cfg.base}/api/admin/waitlist?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { waitlist?: WaitlistItem[] };
    return data.waitlist ?? [];
  } catch {
    return [];
  }
}

export async function getStats(eventId: string): Promise<EventStats | null> {
  const cfg = getAdminConfig();
  if (!cfg) return null;
  const cookieHeader = await getServerCookieHeader();

  try {
    const response = await fetch(`${cfg.base}/api/admin/stats?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { stats?: EventStats };
    return data.stats ?? null;
  } catch {
    return null;
  }
}

export async function getAuthMe(): Promise<{
  authenticated: boolean;
  role?: "admin" | "organizer" | "participant";
  userId?: string;
  telegramId?: number;
} | null> {
  const cfg = getAdminConfig();
  if (!cfg) return null;
  const cookieHeader = await getServerCookieHeader();

  try {
    const response = await fetch(`${cfg.base}/api/admin/auth/me`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) return { authenticated: false };
    return (await response.json()) as any;
  } catch {
    return null;
  }
}
import { cookies } from "next/headers";
