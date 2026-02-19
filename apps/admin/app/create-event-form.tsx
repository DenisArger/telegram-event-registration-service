"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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
          startsAt: normalizedStartsAt,
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
          placeholder="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="startsAt (ISO)"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <input
          placeholder="capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <input
          placeholder="location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <textarea
          placeholder="description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

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
