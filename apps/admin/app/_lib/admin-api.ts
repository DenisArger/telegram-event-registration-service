export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: "draft" | "published" | "closed";
  capacity: number;
}

export interface AttendeeItem {
  userId: string;
  fullName: string;
  username: string | null;
  status: "registered" | "cancelled";
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

function getAdminConfig(): { base: string; email: string } | null {
  const base = process.env.ADMIN_API_BASE_URL;
  const email = process.env.ADMIN_REQUEST_EMAIL;
  if (!base || !email) return null;
  return { base, email };
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

  try {
    const response = await fetch(`${cfg.base}/api/admin/events`, {
      cache: "no-store",
      headers: {
        "x-admin-email": cfg.email
      }
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

  try {
    const response = await fetch(`${cfg.base}/api/admin/events?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: {
        "x-admin-email": cfg.email
      }
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

  try {
    const response = await fetch(`${cfg.base}/api/admin/attendees?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: {
        "x-admin-email": cfg.email
      }
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

  try {
    const response = await fetch(`${cfg.base}/api/admin/waitlist?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: {
        "x-admin-email": cfg.email
      }
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

  try {
    const response = await fetch(`${cfg.base}/api/admin/stats?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: {
        "x-admin-email": cfg.email
      }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { stats?: EventStats };
    return data.stats ?? null;
  } catch {
    return null;
  }
}
