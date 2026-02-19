"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishButton({ eventId }: { eventId: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function publish() {
    const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    const email = process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    if (!base || !email) {
      setMessage(ru ? "Не заданы NEXT_PUBLIC переменные для админки." : "Missing NEXT_PUBLIC admin env.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({ eventId })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось опубликовать событие." : "Publish failed."));
        return;
      }

      setMessage(ru ? "Событие опубликовано." : "Event published.");
      router.refresh();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button onClick={publish} disabled={loading}>
        {loading ? (ru ? "Публикация..." : "Publishing...") : (ru ? "Опубликовать" : "Publish")}
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
