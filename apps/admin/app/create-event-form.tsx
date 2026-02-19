"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateEventForm() {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
          location: location.trim() || null
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
      setMessage(ru ? "Событие создано в статусе draft." : "Event created in draft status.");
      router.refresh();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p>{ru ? "Создать мероприятие" : "Create event"}</p>
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
        <button onClick={submit} disabled={loading}>
          {loading ? (ru ? "Создание..." : "Creating...") : (ru ? "Создать событие" : "Create event")}
        </button>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}
