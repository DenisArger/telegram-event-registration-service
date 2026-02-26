"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";
import { Button } from "./_components/ui/button";

export function DeleteEventButton({ eventId, organizationId }: { eventId: string; organizationId?: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function remove() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    const confirmed = window.confirm(
      ru ? "Удалить мероприятие? Это действие нельзя отменить." : "Delete event? This action cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/events`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ ...(organizationId ? { organizationId } : {}), eventId })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? (ru ? "Не удалось удалить событие." : "Delete failed."));
        return;
      }

      setMessage(ru ? "Событие удалено." : "Event deleted.");
      router.refresh();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button onClick={remove} loading={loading} variant="danger">
        {loading ? (ru ? "Удаление..." : "Deleting...") : (ru ? "Удалить" : "Delete")}
      </Button>
      {message ? <span className="text-sm text-muted">{message}</span> : null}
    </div>
  );
}
