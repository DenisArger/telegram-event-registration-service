"use client";

import React, { useState } from "react";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "./_lib/admin-client";
import { Button } from "./_components/ui/button";
import { InlineAlert } from "./_components/ui/inline-alert";

export function ExportButton({ eventId, organizationId }: { eventId: string; organizationId?: string }) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onExport() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ eventId });
      if (organizationId) params.set("organizationId", organizationId);
      const response = await fetch(
        `${base}/api/admin/export?${params.toString()}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setMessage(err?.message ?? (ru ? "Не удалось экспортировать CSV." : "Export failed."));
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(ru ? "CSV скачан." : "CSV downloaded.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button onClick={onExport} loading={loading}>
        {loading ? (ru ? "Экспорт..." : "Exporting...") : "Export CSV"}
      </Button>
      {message ? <InlineAlert message={message} tone="info" /> : null}
    </div>
  );
}
