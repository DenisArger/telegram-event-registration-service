"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "../close-button";
import { EventQuestionsEditor } from "../event-questions-editor";
import { PublishButton } from "../publish-button";

interface EditableEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  capacity: number;
  status: "draft" | "published" | "closed";
}

export function EventEditor({ event }: { event: EditableEvent }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [startsAt, setStartsAt] = useState(event.startsAt);
  const [capacity, setCapacity] = useState(String(event.capacity));
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    const email = process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    if (!base || !email) {
      setMessage(
        ru
          ? "Не заданы NEXT_PUBLIC_ADMIN_API_BASE_URL или NEXT_PUBLIC_ADMIN_REQUEST_EMAIL."
          : "Missing NEXT_PUBLIC_ADMIN_API_BASE_URL or NEXT_PUBLIC_ADMIN_REQUEST_EMAIL."
      );
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedStartsAt = startsAt.trim();
    const numericCapacity = Number(capacity);

    if (!normalizedTitle || !normalizedStartsAt || !Number.isInteger(numericCapacity) || numericCapacity <= 0) {
      setMessage(
        ru
          ? "Нужны корректные title, startsAt и capacity."
          : "Valid title, startsAt, and capacity are required."
      );
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/events`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({
          eventId: event.id,
          title: normalizedTitle,
          startsAt: normalizedStartsAt,
          capacity: numericCapacity,
          description: description.trim() || null,
          location: location.trim() || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось обновить событие." : "Failed to update event."));
        return;
      }

      setMessage(ru ? "Событие обновлено." : "Event updated.");
      router.refresh();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-grid">
      <section className="card">
        <p>{ru ? "Редактировать событие" : "Edit event"}</p>
        <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
          <input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="startsAt (ISO)" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <input placeholder="capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <input placeholder="location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <textarea placeholder="description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={loading}>
              {loading ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
            </button>
            {event.status === "draft" ? <PublishButton eventId={event.id} /> : null}
            {event.status === "published" ? <CloseButton eventId={event.id} /> : null}
          </div>
          {message ? <p>{message}</p> : null}
        </div>
      </section>

      <section className="card">
        <EventQuestionsEditor eventId={event.id} />
      </section>
    </div>
  );
}
