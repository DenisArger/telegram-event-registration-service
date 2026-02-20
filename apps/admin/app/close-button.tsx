"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";

export function CloseButton({ eventId }: { eventId: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function close() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/close`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ eventId })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось закрыть событие." : "Close failed."));
        return;
      }

      setMessage(ru ? "Событие закрыто." : "Event closed.");
      router.refresh();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button onClick={close} disabled={loading}>
        {loading ? (ru ? "Закрытие..." : "Closing...") : (ru ? "Закрыть" : "Close")}
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
