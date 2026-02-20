"use client";

import React, { useState } from "react";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";

export function PromoteButton({ eventId }: { eventId: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function promote() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/promote`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ eventId })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось продвинуть участника." : "Promotion failed."));
        return;
      }

      if (data?.status === "empty_waitlist") {
        setMessage(ru ? "Лист ожидания пуст." : "Waitlist is empty.");
        return;
      }

      setMessage(ru ? `Продвинут пользователь: ${data?.user_id ?? "unknown"}` : `Promoted user: ${data?.user_id ?? "unknown"}`);
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={promote} disabled={loading}>
        {loading ? (ru ? "Выполняется..." : "Promoting...") : (ru ? "Продвинуть из листа ожидания" : "Promote next from waitlist")}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
