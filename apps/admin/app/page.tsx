import { CheckInForm } from "./checkin-form";
import { PromoteButton } from "./promote-button";

async function getHealth(): Promise<string> {
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

interface EventItem {
  id: string;
  title: string;
  startsAt: string;
  status: "draft" | "published" | "closed";
  capacity: number;
}

interface AttendeeItem {
  userId: string;
  fullName: string;
  username: string | null;
  status: "registered" | "cancelled";
  checkedIn: boolean;
}

interface WaitlistItem {
  userId: string;
  fullName: string;
  username: string | null;
  position: number;
}

interface EventStats {
  registeredCount: number;
  checkedInCount: number;
  waitlistCount: number;
  noShowRate: number;
}

async function getAdminEvents(): Promise<EventItem[]> {
  const base = process.env.ADMIN_API_BASE_URL;
  const email = process.env.ADMIN_REQUEST_EMAIL;
  if (!base || !email) return [];

  try {
    const response = await fetch(`${base}/api/admin/events`, {
      cache: "no-store",
      headers: {
        "x-admin-email": email
      }
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { events?: EventItem[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

async function getAttendees(eventId: string): Promise<AttendeeItem[]> {
  const base = process.env.ADMIN_API_BASE_URL;
  const email = process.env.ADMIN_REQUEST_EMAIL;
  if (!base || !email) return [];

  try {
    const response = await fetch(`${base}/api/admin/attendees?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: {
        "x-admin-email": email
      }
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { attendees?: AttendeeItem[] };
    return data.attendees ?? [];
  } catch {
    return [];
  }
}

async function getWaitlist(eventId: string): Promise<WaitlistItem[]> {
  const base = process.env.ADMIN_API_BASE_URL;
  const email = process.env.ADMIN_REQUEST_EMAIL;
  if (!base || !email) return [];

  try {
    const response = await fetch(`${base}/api/admin/waitlist?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: {
        "x-admin-email": email
      }
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { waitlist?: WaitlistItem[] };
    return data.waitlist ?? [];
  } catch {
    return [];
  }
}

async function getStats(eventId: string): Promise<EventStats | null> {
  const base = process.env.ADMIN_API_BASE_URL;
  const email = process.env.ADMIN_REQUEST_EMAIL;
  if (!base || !email) return null;

  try {
    const response = await fetch(`${base}/api/admin/stats?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      headers: {
        "x-admin-email": email
      }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { stats?: EventStats };
    return data.stats ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await getHealth();
  const events = await getAdminEvents();
  const firstEvent = events[0] ?? null;
  const attendees = firstEvent ? await getAttendees(firstEvent.id) : [];
  const waitlist = firstEvent ? await getWaitlist(firstEvent.id) : [];
  const stats = firstEvent ? await getStats(firstEvent.id) : null;

  return (
    <main>
      <h1>Event Registration Admin</h1>
      <p>Initial scaffold for internal events operations.</p>

      <section className="card">
        <h2>System Status</h2>
        <p>Bot API health: {health}</p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Events</h2>
        {events.length === 0 ? (
          <p>No events available or admin API is not configured.</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong> ({event.status}) —{" "}
                {new Date(event.startsAt).toLocaleString()} — cap: {event.capacity}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Attendees {firstEvent ? `for "${firstEvent.title}"` : ""}</h2>
        {!firstEvent ? (
          <p>Selecting attendees requires at least one event.</p>
        ) : attendees.length === 0 ? (
          <p>No attendees yet.</p>
        ) : (
          <ul>
            {attendees.map((attendee) => (
              <li key={attendee.userId}>
                {attendee.fullName}
                {attendee.username ? ` (@${attendee.username})` : ""} — {attendee.status}
                {attendee.checkedIn ? " — checked in ✅" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Stats {firstEvent ? `for "${firstEvent.title}"` : ""}</h2>
        {!stats ? (
          <p>Stats are unavailable.</p>
        ) : (
          <ul>
            <li>Registered: {stats.registeredCount}</li>
            <li>Checked in: {stats.checkedInCount}</li>
            <li>Waitlist: {stats.waitlistCount}</li>
            <li>No-show rate: {stats.noShowRate}%</li>
          </ul>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Waitlist {firstEvent ? `for "${firstEvent.title}"` : ""}</h2>
        {!firstEvent ? (
          <p>No event selected.</p>
        ) : waitlist.length === 0 ? (
          <p>Waitlist is empty.</p>
        ) : (
          <ul>
            {waitlist.map((entry) => (
              <li key={entry.userId}>
                #{entry.position} {entry.fullName}
                {entry.username ? ` (@${entry.username})` : ""}
              </li>
            ))}
          </ul>
        )}
        {firstEvent ? <PromoteButton eventId={firstEvent.id} /> : null}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Check-in</h2>
        <CheckInForm />
      </section>
    </main>
  );
}
