"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "../close-button";
import { EventQuestionsEditor } from "../event-questions-editor";
import { PublishButton } from "../publish-button";
import { MarkdownPreview } from "../_components/markdown-preview";
import { Button } from "../_components/ui/button";
import { InlineAlert } from "../_components/ui/inline-alert";
import { datetimeLocalToIso, isoToDatetimeLocal } from "../_lib/datetime";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "../_lib/admin-client";

interface EditableEvent {
  id: string;
  title: string;
  description?: string | null;
  registrationSuccessMessage?: string | null;
  location?: string | null;
  startsAt: string | null;
  endsAt?: string | null;
  capacity: number | null;
  status: "draft" | "published" | "closed";
}

export function EventEditor({ event, organizationId }: { event: EditableEvent; organizationId?: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [startsAt, setStartsAt] = useState(isoToDatetimeLocal(event.startsAt));
  const [endsAt, setEndsAt] = useState(isoToDatetimeLocal(event.endsAt));
  const [capacity, setCapacity] = useState(event.capacity == null ? "" : String(event.capacity));
  const [description, setDescription] = useState(event.description ?? "");
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState(event.registrationSuccessMessage ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
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
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          ...(organizationId ? { organizationId } : {}),
          eventId: event.id,
          title: normalizedTitle,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
          capacity: numericCapacity,
          description: description.trim() || null,
          registrationSuccessMessage: registrationSuccessMessage.trim() || null,
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

  async function generateAiDraft() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setMessage(ru ? "Сначала укажите название мероприятия." : "Set event title first.");
      return;
    }

    setAiLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/ai-draft`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          title: normalizedTitle,
          startsAt: datetimeLocalToIso(startsAt),
          location: location.trim() || null,
          description: description.trim() || null,
          locale: ru ? "ru" : "en",
          tone: "friendly"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось сгенерировать AI-черновик." : "Failed to generate AI draft."));
        return;
      }

      const draft = String(data?.draft ?? "").trim();
      if (!draft) {
        setMessage(ru ? "AI вернул пустой черновик." : "AI returned an empty draft.");
        return;
      }
      setDescription(draft);
      setMessage(ru ? "AI-черновик добавлен в описание." : "AI draft inserted into description.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="section-grid">
      <section className="card">
        <p>{ru ? "Редактировать событие" : "Edit event"}</p>
        <div className="grid max-w-[560px] gap-2">
          <input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <small>{ru ? "Короткое понятное название. Поддерживается Markdown." : "Short clear title. Markdown is supported."}</small>
          {title.trim() ? (
            <div className="rounded-lg border border-border bg-surface-elevated p-3">
              <p className="mt-0">{ru ? "Предпросмотр заголовка" : "Title preview"}</p>
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
          <div className="flex gap-2">
            <Button onClick={generateAiDraft} loading={aiLoading} disabled={loading}>
              {aiLoading ? (ru ? "Генерация..." : "Generating...") : (ru ? "AI-черновик" : "AI draft")}
            </Button>
          </div>
          <small>{ru ? "Поддерживается Markdown разметка" : "Markdown is supported"}</small>
          {description.trim() ? (
            <div className="rounded-lg border border-border bg-surface-elevated p-3">
              <p className="mt-0">{ru ? "Предпросмотр описания" : "Description preview"}</p>
              <MarkdownPreview markdown={description} />
            </div>
          ) : null}
          <textarea
            placeholder={ru ? "Текст поздравления при регистрации (Markdown, опционально)" : "Registration success message (Markdown, optional)"}
            value={registrationSuccessMessage}
            onChange={(e) => setRegistrationSuccessMessage(e.target.value)}
          />
          <small>
            {ru
              ? "Этот текст бот отправит после успешной регистрации."
              : "Bot sends this text after successful registration."}
          </small>
          {registrationSuccessMessage.trim() ? (
            <div className="rounded-lg border border-border bg-surface-elevated p-3">
              <p className="mt-0">{ru ? "Предпросмотр поздравления" : "Success message preview"}</p>
              <MarkdownPreview markdown={registrationSuccessMessage} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} loading={loading} variant="primary">
              {loading ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
            </Button>
            {event.status === "draft" ? <PublishButton eventId={event.id} organizationId={organizationId} /> : null}
            {event.status === "published" ? <CloseButton eventId={event.id} organizationId={organizationId} /> : null}
          </div>
          {message ? <InlineAlert message={message} /> : null}
        </div>
      </section>

      <section className="card">
        <EventQuestionsEditor eventId={event.id} organizationId={organizationId} />
      </section>
    </div>
  );
}
