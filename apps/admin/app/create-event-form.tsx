"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownPreview } from "./_components/markdown-preview";
import { datetimeLocalToIso } from "./_lib/datetime";

interface NewQuestionInput {
  prompt: string;
  required: boolean;
}

export function CreateEventForm({
  showTitle = true,
  onCreated
}: {
  showTitle?: boolean;
  onCreated?: () => void;
}) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [questions, setQuestions] = useState<NewQuestionInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateQuestion(index: number, patch: Partial<NewQuestionInput>) {
    setQuestions((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addQuestion() {
    if (questions.length >= 10) return;
    setQuestions((prev) => [...prev, { prompt: "", required: false }]);
  }

  async function submit() {
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
    const numericCapacity = Number(capacity);

    if (!normalizedTitle || !startsAtIso || !Number.isInteger(numericCapacity) || numericCapacity <= 0) {
      setMessage(
        ru
          ? "Нужны корректные title, startsAt и capacity."
          : "Valid title, startsAt, and capacity are required."
      );
      return;
    }
    if (normalizedEndsAt && !endsAtIso) {
      setMessage(ru ? "Нужен корректный endsAt." : "Valid endsAt is required.");
      return;
    }
    if (endsAtIso && new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      setMessage(ru ? "Дата окончания должна быть позже начала." : "End date must be later than start date.");
      return;
    }

    if (questions.length > 10) {
      setMessage(ru ? "Максимум 10 вопросов." : "Maximum 10 questions.");
      return;
    }

    const normalizedQuestions = questions.map((item) => ({
      prompt: item.prompt.trim(),
      required: item.required
    }));

    if (normalizedQuestions.some((item) => item.prompt.length < 1 || item.prompt.length > 500)) {
      setMessage(ru ? "Текст вопроса должен быть 1..500 символов." : "Question text must be 1..500 chars.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({
          title: normalizedTitle,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
          capacity: numericCapacity,
          description: description.trim() || null,
          location: location.trim() || null,
          questions: normalizedQuestions
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось создать событие." : "Failed to create event."));
        return;
      }

      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setCapacity("20");
      setDescription("");
      setLocation("");
      setQuestions([]);
      setMessage(ru ? "Событие создано в статусе draft." : "Event created in draft status.");
      router.refresh();
      onCreated?.();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {showTitle ? <p>{ru ? "Создать мероприятие" : "Create event"}</p> : null}
      <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
        <input
          placeholder={ru ? "Название мероприятия" : "Event title"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <small>
          {ru
            ? "Короткое понятное название. Поддерживается Markdown. Например: **POWER** #12"
            : "Short clear title. Markdown is supported. Example: **POWER** #12"}
        </small>
        {title.trim() ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            <p style={{ marginTop: 0 }}>{ru ? "Предпросмотр заголовка" : "Title preview"}</p>
            <MarkdownPreview markdown={title} />
          </div>
        ) : null}
        <input
          type="datetime-local"
          placeholder="startsAt"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <small>{ru ? "Дата и время начала мероприятия" : "Event start date and time"}</small>
        <input
          type="datetime-local"
          placeholder="endsAt"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
        <small>{ru ? "Дата и время окончания (необязательно)" : "Event end date and time (optional)"}</small>
        <input
          placeholder={ru ? "Вместимость" : "Capacity"}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <small>{ru ? "Количество доступных мест (целое число)" : "Number of available seats (integer)"}</small>
        <input
          placeholder={ru ? "Локация (опционально)" : "Location (optional)"}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <small>{ru ? "Где проходит мероприятие" : "Where the event takes place"}</small>
        <textarea
          placeholder={ru ? "Описание (поддерживает Markdown)" : "Description (Markdown supported)"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <small>{ru ? "Поддерживаются # заголовки, **жирный**, *курсив*, `код`, [ссылка](https://...)" : "Supports # headings, **bold**, *italic*, `code`, [link](https://...)"}</small>
        {description.trim() ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            <p style={{ marginTop: 0 }}>{ru ? "Предпросмотр описания" : "Description preview"}</p>
            <MarkdownPreview markdown={description} />
          </div>
        ) : null}

        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
          <strong>{ru ? "Вопросы при регистрации" : "Registration questions"}</strong>
          {questions.length === 0 ? (
            <p style={{ margin: 0 }}>{ru ? "Вопросов пока нет." : "No questions yet."}</p>
          ) : null}
          {questions.map((question, index) => (
            <div key={index} style={{ display: "grid", gap: 6, border: "1px solid #eee", borderRadius: 6, padding: 8 }}>
              <input
                placeholder={ru ? `Вопрос #${index + 1}` : `Question #${index + 1}`}
                value={question.prompt}
                onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                />
                {ru ? "Обязательный" : "Required"}
              </label>
              <button type="button" onClick={() => removeQuestion(index)}>
                {ru ? "Удалить вопрос" : "Remove question"}
              </button>
            </div>
          ))}
          <button type="button" onClick={addQuestion} disabled={questions.length >= 10}>
            {ru ? "Добавить вопрос" : "Add question"}
          </button>
        </div>

        <button onClick={submit} disabled={loading}>
          {loading ? (ru ? "Создание..." : "Creating...") : (ru ? "Создать событие" : "Create event")}
        </button>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}
