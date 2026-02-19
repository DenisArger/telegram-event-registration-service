import React from "react";
import { CheckInForm } from "./checkin-form";
import { CreateEventForm } from "./create-event-form";
import { ExportButton } from "./export-button";
import { PromoteButton } from "./promote-button";
import { getUiLocale, ui } from "./i18n";

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
  const locale = getUiLocale();
  const health = await getHealth();
  const events = await getAdminEvents();
  const firstEvent = events[0] ?? null;
  const attendees = firstEvent ? await getAttendees(firstEvent.id) : [];
  const waitlist = firstEvent ? await getWaitlist(firstEvent.id) : [];
  const stats = firstEvent ? await getStats(firstEvent.id) : null;

  return (
    <main>
      <h1>{ui("title", locale)}</h1>
      <p>{ui("subtitle", locale)}</p>

      <section className="card">
        <h2>{ui("system_status", locale)}</h2>
        <p>{ui("bot_health", locale)}: {health}</p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <CreateEventForm />
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>{ui("events", locale)}</h2>
        {events.length === 0 ? (
          <p>{ui("no_events", locale)}</p>
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
        <h2>{ui("attendees", locale)} {firstEvent ? `${ui("event_for", locale)} "${firstEvent.title}"` : ""}</h2>
        {!firstEvent ? (
          <p>{ui("attendees_need_event", locale)}</p>
        ) : attendees.length === 0 ? (
          <p>{ui("no_attendees", locale)}</p>
        ) : (
          <ul>
            {attendees.map((attendee) => (
              <li key={attendee.userId}>
                {attendee.fullName}
                {attendee.username ? ` (@${attendee.username})` : ""} — {attendee.status}
                {attendee.checkedIn ? ` — ${ui("checked_in_mark", locale)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>{ui("stats", locale)} {firstEvent ? `${ui("event_for", locale)} "${firstEvent.title}"` : ""}</h2>
        {!stats ? (
          <p>{ui("stats_unavailable", locale)}</p>
        ) : (
          <ul>
            <li>{ui("registered", locale)}: {stats.registeredCount}</li>
            <li>{ui("checked_in", locale)}: {stats.checkedInCount}</li>
            <li>{ui("waitlist", locale)}: {stats.waitlistCount}</li>
            <li>{ui("no_show_rate", locale)}: {stats.noShowRate}%</li>
          </ul>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>{ui("waitlist", locale)} {firstEvent ? `${ui("event_for", locale)} "${firstEvent.title}"` : ""}</h2>
        {!firstEvent ? (
          <p>{ui("no_event_selected", locale)}</p>
        ) : waitlist.length === 0 ? (
          <p>{ui("waitlist_empty", locale)}</p>
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
        {firstEvent ? (
          <div style={{ display: "flex", gap: 8 }}>
            <PromoteButton eventId={firstEvent.id} />
            <ExportButton eventId={firstEvent.id} />
          </div>
        ) : null}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>{ui("checkin", locale)}</h2>
        <CheckInForm />
      </section>
    </main>
  );
}
