"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "../close-button";
import { EventQuestionsEditor } from "../event-questions-editor";
import { PublishButton } from "../publish-button";
import { MarkdownPreview } from "../_components/markdown-preview";
import { AutoTextarea } from "../_components/ui/auto-textarea";
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
  showTitle?: boolean;
  blankLineAfterTitle?: boolean;
  showSchedule?: boolean;
  showStartsAt?: boolean;
  showEndsAt?: boolean;
  showCapacity?: boolean;
  showLocation?: boolean;
  showDescription?: boolean;
  showRegistrationSuccessMessage?: boolean;
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
  const [showTitle, setShowTitle] = useState(event.showTitle ?? true);
  const [blankLineAfterTitle, setBlankLineAfterTitle] = useState(event.blankLineAfterTitle ?? false);
  const [showStartsAt, setShowStartsAt] = useState(event.showStartsAt ?? event.showSchedule ?? true);
  const [showEndsAt, setShowEndsAt] = useState(event.showEndsAt ?? event.showSchedule ?? true);
  const [showCapacity, setShowCapacity] = useState(event.showCapacity ?? event.showSchedule ?? true);
  const [showLocation, setShowLocation] = useState(event.showLocation ?? true);
  const [showDescription, setShowDescription] = useState(event.showDescription ?? true);
  const [showRegistrationSuccessMessage, setShowRegistrationSuccessMessage] = useState(event.showRegistrationSuccessMessage ?? true);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");

  const hasPreviewContent = Boolean(
    title.trim() ||
    (showDescription && description.trim()) ||
    (showRegistrationSuccessMessage && registrationSuccessMessage.trim()) ||
    (showLocation && location.trim()) ||
    (showStartsAt && startsAt.trim()) ||
    (showEndsAt && endsAt.trim()) ||
    (showCapacity && capacity.trim())
  );
  const hasMetaPreview = Boolean(
    showStartsAt ||
    showEndsAt ||
    (showCapacity && capacity.trim()) ||
    (showLocation && location.trim())
  );
  const combinedBodyPreview = [
    showTitle && title.trim() ? title.trim() : null,
    showTitle && blankLineAfterTitle && showDescription && description.trim() ? "" : null,
    showDescription && description.trim() ? description.trim() : null
  ]
    .filter((item) => item !== null)
    .join("\n");
  const startsAtPreview = startsAt.trim()
    ? new Date(datetimeLocalToIso(startsAt) ?? startsAt).toLocaleString()
    : (ru ? "не указано" : "not specified");
  const endsAtPreview = endsAt.trim()
    ? new Date(datetimeLocalToIso(endsAt) ?? endsAt).toLocaleString()
    : (ru ? "не указано" : "not specified");

  async function save() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessageTone("error");
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
      setMessageTone("error");
      setMessage(ru ? "Укажите название мероприятия." : "Event title is required.");
      return;
    }
    if (normalizedStartsAt && !startsAtIso) {
      setMessageTone("error");
      setMessage(ru ? "Укажите корректные дату и время начала." : "Valid start date and time are required.");
      return;
    }
    if (normalizedCapacity && (!Number.isInteger(numericCapacity) || (numericCapacity ?? 0) <= 0)) {
      setMessageTone("error");
      setMessage(ru ? "Вместимость должна быть положительным целым числом." : "Capacity must be a positive integer.");
      return;
    }
    if (normalizedEndsAt && !endsAtIso) {
      setMessageTone("error");
      setMessage(ru ? "Нужен корректный endsAt." : "Valid endsAt is required.");
      return;
    }
    if (startsAtIso && endsAtIso && new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      setMessageTone("error");
      setMessage(ru ? "Дата окончания должна быть позже начала." : "End date must be later than start date.");
      return;
    }

    setLoading(true);
    setMessageTone("info");
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
          ,
          showTitle,
          blankLineAfterTitle,
          showStartsAt,
          showEndsAt,
          showCapacity,
          showLocation,
          showDescription,
          showRegistrationSuccessMessage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessageTone("error");
        setMessage(data?.message ?? (ru ? "Не удалось обновить событие." : "Failed to update event."));
        return;
      }

      setMessageTone("success");
      setMessage(ru ? "Событие обновлено." : "Event updated.");
      router.refresh();
    } catch {
      setMessageTone("error");
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function generateAiDraft() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessageTone("error");
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setMessageTone("error");
      setMessage(ru ? "Сначала укажите название мероприятия." : "Set event title first.");
      return;
    }

    setAiLoading(true);
    setMessageTone("info");
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
        setMessageTone("error");
        setMessage(data?.message ?? (ru ? "Не удалось сгенерировать AI-черновик." : "Failed to generate AI draft."));
        return;
      }

      const draft = String(data?.draft ?? "").trim();
      if (!draft) {
        setMessageTone("error");
        setMessage(ru ? "AI вернул пустой черновик." : "AI returned an empty draft.");
        return;
      }
      setDescription(draft);
      setMessageTone("success");
      setMessage(ru ? "AI-черновик добавлен в описание." : "AI draft inserted into description.");
    } catch {
      setMessageTone("error");
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="section-grid">
      <section className="card">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,560px)_minmax(280px,1fr)] xl:items-start">
          <div className="grid gap-2">
            <small>{ru ? "Короткое понятное название. Поддерживается Markdown." : "Short clear title. Markdown is supported."}</small>
            <input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <small>{ru ? "Дата и время начала мероприятия (необязательно)" : "Event start date and time (optional)"}</small>
            <input type="datetime-local" placeholder="startsAt" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <small>{ru ? "Дата и время окончания (необязательно)" : "Event end date and time (optional)"}</small>
            <input type="datetime-local" placeholder="endsAt" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            <small>{ru ? "Количество доступных мест (целое число, если указано)" : "Number of available seats (integer, if provided)"}</small>
            <input placeholder="capacity (optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            <small>{ru ? "Где проходит мероприятие" : "Where the event takes place"}</small>
            <input placeholder="location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
            <small>{ru ? "Поддерживается Markdown разметка" : "Markdown is supported"}</small>
            <AutoTextarea placeholder="description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={generateAiDraft} loading={aiLoading} disabled={loading}>
                {aiLoading ? (ru ? "Генерация..." : "Generating...") : (ru ? "AI-черновик" : "AI draft")}
              </Button>
            </div>
            <small>
              {ru
                ? "Этот текст бот отправит после успешной регистрации."
                : "Bot sends this text after successful registration."}
            </small>
            <AutoTextarea
              placeholder={ru ? "Текст поздравления при регистрации (Markdown, опционально)" : "Registration success message (Markdown, optional)"}
              value={registrationSuccessMessage}
              onChange={(e) => setRegistrationSuccessMessage(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} loading={loading} variant="primary">
                {loading ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
              </Button>
              {event.status === "draft" ? <PublishButton eventId={event.id} organizationId={organizationId} /> : null}
              {event.status === "published" ? <CloseButton eventId={event.id} organizationId={organizationId} /> : null}
            </div>
            {message ? <InlineAlert message={message} tone={messageTone} /> : null}
          </div>

          <aside className="grid gap-3 xl:sticky xl:top-6">
            <div className="rounded-xl border border-border bg-surface-elevated/70 p-4">
              <p className="mt-0 font-medium text-text">{ru ? "Предварительный просмотр" : "Live preview"}</p>
              <p className="mt-1 text-xs">
                {ru ? "Показывает, как текст будет выглядеть в интерфейсе и сообщениях." : "Shows how the text will appear in the UI and messages."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="mt-0">{ru ? "Состав сообщения" : "Message content"}</p>
              <div className="mt-3 grid gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} />
                  {ru ? "Показывать заголовок" : "Show title"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={blankLineAfterTitle} onChange={(e) => setBlankLineAfterTitle(e.target.checked)} />
                  {ru ? "Пустая строка после заголовка" : "Blank line after title"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={showStartsAt} onChange={(e) => setShowStartsAt(e.target.checked)} />
                  {ru ? "Показывать дату начала" : "Show start date"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={showEndsAt} onChange={(e) => setShowEndsAt(e.target.checked)} />
                  {ru ? "Показывать дату окончания" : "Show end date"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={showCapacity} onChange={(e) => setShowCapacity(e.target.checked)} />
                  {ru ? "Показывать вместимость" : "Show capacity"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} />
                  {ru ? "Показывать место проведения" : "Show location"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={showDescription} onChange={(e) => setShowDescription(e.target.checked)} />
                  {ru ? "Показывать описание" : "Show description"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4" checked={showRegistrationSuccessMessage} onChange={(e) => setShowRegistrationSuccessMessage(e.target.checked)} />
                  {ru ? "Отправлять сообщение после регистрации" : "Send success message"}
                </label>
              </div>
            </div>

            {hasPreviewContent ? (
              <div className="rounded-xl border border-border bg-surface-elevated p-4">
                <p className="mt-0">{ru ? "Карточка события" : "Event card preview"}</p>
                {combinedBodyPreview ? <MarkdownPreview markdown={combinedBodyPreview} className="markdown-preview-inline mt-3" /> : null}

                {hasMetaPreview ? (
                  <div className="mt-3 grid gap-1">
                    {showStartsAt ? (
                      <p className="m-0 text-xs">
                        {ru ? "Начало" : "Starts"}: {startsAtPreview}
                      </p>
                    ) : null}
                    {showEndsAt ? (
                      <p className="m-0 text-xs">
                        {ru ? "Окончание" : "Ends"}: {endsAtPreview}
                      </p>
                    ) : null}
                    {showCapacity && capacity.trim() ? (
                      <p className="m-0 text-xs">
                        {ru ? "Вместимость" : "Capacity"}: {capacity.trim()}
                      </p>
                    ) : null}
                    {showLocation && location.trim() ? (
                      <p className="m-0 text-xs">
                        {ru ? "Место" : "Location"}: {location.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {showRegistrationSuccessMessage && registrationSuccessMessage.trim() ? (
                  <div className="mt-4 border-l-2 border-success/50 pl-3">
                    <p className="mt-0 text-xs font-medium text-text">{ru ? "Сообщение после регистрации" : "Success message"}</p>
                    <MarkdownPreview markdown={registrationSuccessMessage} className="markdown-preview-inline mt-2" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-surface-elevated/50 p-4">
                <p className="mt-0">{ru ? "Пока нечего показывать" : "Nothing to preview yet"}</p>
                <p className="mt-1 text-xs">
                  {ru ? "Введите заголовок, описание или текст поздравления, и здесь появится превью." : "Enter a title, description, or success message and the preview will appear here."}
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="card">
        <EventQuestionsEditor eventId={event.id} organizationId={organizationId} />
      </section>
    </div>
  );
}
