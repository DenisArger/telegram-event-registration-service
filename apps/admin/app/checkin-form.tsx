"use client";

import React, { useState } from "react";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";

export function CheckInForm({
  initialEventId = "",
  organizationId = ""
}: {
  initialEventId?: string;
  organizationId?: string;
}) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const [eventId, setEventId] = useState(initialEventId);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }
    if (!eventId || !userId) {
      setMessage(ru ? "Нужны eventId и userId." : "eventId and userId are required.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${base}/api/admin/checkin`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          ...(organizationId ? { organizationId } : {}),
          eventId,
          userId,
          method: "manual"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось выполнить чекин." : "Check-in failed."));
        return;
      }

      setMessage(
        data?.status === "already_checked_in"
          ? (ru ? "Участник уже отмечен." : "Already checked in.")
          : (ru ? "Чекин выполнен." : "Check-in successful.")
      );
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p>{ru ? "Ручной чекин" : "Manual check-in"}</p>
      <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
        <input
          placeholder="eventId"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        />
        <input
          placeholder="userId"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button onClick={submit} disabled={loading}>
          {loading ? (ru ? "Выполняется..." : "Checking in...") : (ru ? "Отметить участника" : "Check in attendee")}
        </button>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}
