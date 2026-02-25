"use client";

import React, { useEffect, useState } from "react";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";
import { Button } from "./_components/ui/button";
import { InlineAlert } from "./_components/ui/inline-alert";

interface QuestionItem {
  id?: string;
  prompt: string;
  isRequired: boolean;
  position: number;
}

interface EventQuestionApiItem {
  id?: string;
  prompt?: string | null;
  isRequired?: boolean | null;
  position?: number | null;
}

export function EventQuestionsEditor({ eventId, organizationId }: { eventId: string; organizationId?: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const base = getClientAdminApiBase();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!base) return;
      setLoading(true);
      setMessage(null);
      try {
        const params = new URLSearchParams({ eventId });
        if (organizationId) params.set("organizationId", organizationId);
        const response = await fetch(`${base}/api/admin/event-questions?${params.toString()}`, {
          credentials: "include"
        });
        const data = await response.json();
        if (!response.ok) {
          if (mounted) setMessage(data?.message ?? (ru ? "Не удалось загрузить вопросы." : "Failed to load questions."));
          return;
        }
        if (mounted) {
          const items: EventQuestionApiItem[] = Array.isArray(data?.questions) ? data.questions : [];
          setQuestions(
            items.map((item, index: number) => ({
              id: item.id,
              prompt: String(item.prompt ?? ""),
              isRequired: Boolean(item.isRequired),
              position: Number(item.position ?? index + 1)
            }))
          );
        }
      } catch {
        if (mounted) setMessage(ru ? "Сетевая ошибка." : "Network error.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [base, eventId, organizationId, ru]);

  function syncPositions(next: QuestionItem[]) {
    return next.map((item, index) => ({ ...item, position: index + 1 }));
  }

  function addQuestion() {
    if (questions.length >= 10) return;
    setQuestions((prev) => syncPositions([...prev, { prompt: "", isRequired: false, position: prev.length + 1 }]));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => syncPositions(prev.filter((_, idx) => idx !== index)));
  }

  function updateQuestion(index: number, patch: Partial<QuestionItem>) {
    setQuestions((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  async function save() {
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    if (questions.some((item) => item.prompt.trim().length < 1 || item.prompt.trim().length > 500)) {
      setMessage(ru ? "Текст вопроса должен быть 1..500 символов." : "Question text must be 1..500 chars.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/event-questions`, {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          ...(organizationId ? { organizationId } : {}),
          eventId,
          questions: questions.map((item) => ({
            id: item.id,
            prompt: item.prompt.trim(),
            required: item.isRequired
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось сохранить вопросы." : "Failed to save questions."));
        return;
      }

      const items: EventQuestionApiItem[] = Array.isArray(data?.questions) ? data.questions : [];
      setQuestions(
        items.map((item, index: number) => ({
          id: item.id,
          prompt: String(item.prompt ?? ""),
          isRequired: Boolean(item.isRequired),
          position: Number(item.position ?? index + 1)
        }))
      );
      setMessage(ru ? "Вопросы сохранены." : "Questions saved.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 grid gap-3">
      <p className="text-sm font-medium text-text">{ru ? "Вопросы регистрации" : "Registration questions"}</p>
      {loading ? <p>{ru ? "Загрузка..." : "Loading..."}</p> : null}
      {questions.map((question, index) => (
        <div key={question.id ?? index} className="grid gap-2 rounded-lg border border-border bg-surface-elevated p-3">
          <input
            placeholder={ru ? `Вопрос #${index + 1}` : `Question #${index + 1}`}
            value={question.prompt}
            onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
          />
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={question.isRequired}
              onChange={(e) => updateQuestion(index, { isRequired: e.target.checked })}
            />
            {ru ? "Обязательный" : "Required"}
          </label>
          <Button type="button" onClick={() => removeQuestion(index)} variant="danger" className="w-fit">
            {ru ? "Удалить вопрос" : "Remove question"}
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={addQuestion} disabled={questions.length >= 10}>
          {ru ? "Добавить вопрос" : "Add question"}
        </Button>
        <Button type="button" onClick={save} loading={saving} disabled={loading} variant="primary">
          {saving ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить вопросы" : "Save questions")}
        </Button>
      </div>
      {message ? <InlineAlert message={message} /> : null}
    </div>
  );
}
