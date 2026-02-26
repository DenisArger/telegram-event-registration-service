"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";
import { Button } from "./_components/ui/button";
import { ConfirmDialog } from "./_components/ui/confirm-dialog";

export function CloseButton({ eventId, organizationId }: { eventId: string; organizationId?: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        body: JSON.stringify({ ...(organizationId ? { organizationId } : {}), eventId })
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
    <div className="inline-flex items-center gap-2">
      <Button onClick={() => setConfirmOpen(true)} loading={loading} variant="danger">
        {loading ? (ru ? "Закрытие..." : "Closing...") : (ru ? "Закрыть" : "Close")}
      </Button>
      {message ? <span className="text-sm text-muted">{message}</span> : null}
      <ConfirmDialog
        open={confirmOpen}
        title={ru ? "Закрыть мероприятие?" : "Close event?"}
        description={ru ? "Регистрация будет остановлена." : "Registration will be stopped."}
        confirmLabel={ru ? "Закрыть" : "Close"}
        cancelLabel={ru ? "Отмена" : "Cancel"}
        confirmVariant="danger"
        loading={loading}
        onConfirm={async () => {
          await close();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
