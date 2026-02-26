"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";
import { Button } from "./_components/ui/button";
import { ConfirmDialog } from "./_components/ui/confirm-dialog";

export function DeleteEventButton({ eventId, organizationId }: { eventId: string; organizationId?: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function removeConfirmed() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

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
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button onClick={() => setConfirmOpen(true)} loading={loading} variant="danger">
        {loading ? (ru ? "Удаление..." : "Deleting...") : (ru ? "Удалить" : "Delete")}
      </Button>
      {message ? <span className="text-sm text-muted">{message}</span> : null}
      <ConfirmDialog
        open={confirmOpen}
        title={ru ? "Удалить мероприятие?" : "Delete event?"}
        description={ru ? "Это действие нельзя отменить." : "This action cannot be undone."}
        confirmLabel={ru ? "Удалить" : "Delete"}
        cancelLabel={ru ? "Отмена" : "Cancel"}
        confirmVariant="danger"
        loading={loading}
        onConfirm={removeConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
