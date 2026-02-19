"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "../close-button";
import { EventQuestionsEditor } from "../event-questions-editor";
import { PublishButton } from "../publish-button";
import { MarkdownPreview } from "../_components/markdown-preview";
import { datetimeLocalToIso, isoToDatetimeLocal } from "../_lib/datetime";

interface EditableEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string | null;
  endsAt?: string | null;
  capacity: number | null;
  status: "draft" | "published" | "closed";
}

export function EventEditor({ event }: { event: EditableEvent }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [startsAt, setStartsAt] = useState(isoToDatetimeLocal(event.startsAt));
  const [endsAt, setEndsAt] = useState(isoToDatetimeLocal(event.endsAt));
  const [capacity, setCapacity] = useState(event.capacity == null ? "" : String(event.capacity));
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
    const normalizedStartsAt = startsAt;
    const normalizedEndsAt = endsAt;
    const startsAtIso = datetimeLocalToIso(normalizedStartsAt);
    const endsAtIso = datetimeLocalToIso(normalizedEndsAt);
    const normalizedCapacity = capacity.trim();
    const numericCapacity = normalizedCapacity ? Number(normalizedCapacity) : null;

    if (!normalizedTitle) {
      setMessage(ru ? "Укажите название мероприятия." : "Event title is required.");
      return;
    }
    if (normalizedStartsAt && !startsAtIso) {
      setMessage(ru ? "Укажите корректные дату и время начала." : "Valid start date and time are required.");
      return;
    }
    if (normalizedCapacity && (!Number.isInteger(numericCapacity) || (numericCapacity ?? 0) <= 0)) {
      setMessage(ru ? "Вместимость должна быть положительным целым числом." : "Capacity must be a positive integer.");
      return;
    }
    if (normalizedEndsAt && !endsAtIso) {
      setMessage(ru ? "Нужен корректный endsAt." : "Valid endsAt is required.");
      return;
    }
    if (startsAtIso && endsAtIso && new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      setMessage(ru ? "Дата окончания должна быть позже начала." : "End date must be later than start date.");
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
          startsAt: startsAtIso,
          endsAt: endsAtIso,
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
          <small>{ru ? "Короткое понятное название. Поддерживается Markdown." : "Short clear title. Markdown is supported."}</small>
          {title.trim() ? (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
              <p style={{ marginTop: 0 }}>{ru ? "Предпросмотр заголовка" : "Title preview"}</p>
              <MarkdownPreview markdown={title} />
            </div>
          ) : null}
          <input type="datetime-local" placeholder="startsAt" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <small>{ru ? "Дата и время начала мероприятия (необязательно)" : "Event start date and time (optional)"}</small>
          <input type="datetime-local" placeholder="endsAt" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <small>{ru ? "Дата и время окончания (необязательно)" : "Event end date and time (optional)"}</small>
          <input placeholder="capacity (optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <small>{ru ? "Количество доступных мест (целое число, если указано)" : "Number of available seats (integer, if provided)"}</small>
          <input placeholder="location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <small>{ru ? "Где проходит мероприятие" : "Where the event takes place"}</small>
          <textarea placeholder="description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <small>{ru ? "Поддерживается Markdown разметка" : "Markdown is supported"}</small>
          {description.trim() ? (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
              <p style={{ marginTop: 0 }}>{ru ? "Предпросмотр описания" : "Description preview"}</p>
              <MarkdownPreview markdown={description} />
            </div>
          ) : null}

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
