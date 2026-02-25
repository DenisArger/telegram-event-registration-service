import { cookies } from "next/headers";

export interface OrganizationItem {
  id: string;
  name: string;
  role: "owner" | "admin";
}

export interface OrganizationMemberItem {
  organizationId: string;
  userId: string;
  role: "owner" | "admin";
  createdAt: string;
  fullName: string | null;
  username: string | null;
  telegramId: number | null;
}

export interface EventItem {
  id: string;
  organizationId?: string | null;
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

interface AuthMeResponse {
  authenticated: boolean;
  role?: "admin" | "organizer" | "participant";
  userId?: string;
  telegramId?: number;
  organizations?: OrganizationItem[];
}

function getAdminConfig(): { base: string } | null {
  const base = process.env.ADMIN_API_BASE_URL;
  if (!base) return null;
  return { base };
}

function withOrganizationParam(url: URL, organizationId?: string): URL {
  if (organizationId) {
    url.searchParams.set("organizationId", organizationId);
  }
  return url;
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

export async function getAdminEvents(organizationId?: string): Promise<EventItem[]> {
  const cfg = getAdminConfig();
  if (!cfg) return [];
  const cookieHeader = await getServerCookieHeader();
  const url = withOrganizationParam(new URL("/api/admin/events", cfg.base), organizationId);

  try {
    const response = await fetch(url.toString(), {
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

export async function getAdminEventById(eventId: string, organizationId?: string): Promise<EventItem | null> {
  const cfg = getAdminConfig();
  if (!cfg) return null;
  const cookieHeader = await getServerCookieHeader();
  const url = withOrganizationParam(new URL("/api/admin/events", cfg.base), organizationId);
  url.searchParams.set("eventId", eventId);

  try {
    const response = await fetch(url.toString(), {
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

export async function getAttendees(eventId: string, organizationId?: string): Promise<AttendeeItem[]> {
  const cfg = getAdminConfig();
  if (!cfg) return [];
  const cookieHeader = await getServerCookieHeader();
  const url = withOrganizationParam(new URL("/api/admin/attendees", cfg.base), organizationId);
  url.searchParams.set("eventId", eventId);

  try {
    const response = await fetch(url.toString(), {
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

export async function getWaitlist(eventId: string, organizationId?: string): Promise<WaitlistItem[]> {
  const cfg = getAdminConfig();
  if (!cfg) return [];
  const cookieHeader = await getServerCookieHeader();
  const url = withOrganizationParam(new URL("/api/admin/waitlist", cfg.base), organizationId);
  url.searchParams.set("eventId", eventId);

  try {
    const response = await fetch(url.toString(), {
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

export async function getStats(eventId: string, organizationId?: string): Promise<EventStats | null> {
  const cfg = getAdminConfig();
  if (!cfg) return null;
  const cookieHeader = await getServerCookieHeader();
  const url = withOrganizationParam(new URL("/api/admin/stats", cfg.base), organizationId);
  url.searchParams.set("eventId", eventId);

  try {
    const response = await fetch(url.toString(), {
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

export async function getAuthMe(): Promise<AuthMeResponse | null> {
  const cfg = getAdminConfig();
  if (!cfg) return null;
  const cookieHeader = await getServerCookieHeader();

  try {
    const response = await fetch(`${cfg.base}/api/admin/auth/me`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) return { authenticated: false };
    return (await response.json()) as AuthMeResponse;
  } catch {
    return null;
  }
}

export async function getOrganizationMembers(organizationId?: string): Promise<OrganizationMemberItem[]> {
  if (!organizationId) return [];
  const cfg = getAdminConfig();
  if (!cfg) return [];
  const cookieHeader = await getServerCookieHeader();
  const url = withOrganizationParam(new URL("/api/admin/organization-members", cfg.base), organizationId);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { members?: OrganizationMemberItem[] };
    return data.members ?? [];
  } catch {
    return [];
  }
}
