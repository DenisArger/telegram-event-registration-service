"use client";

import { useState } from "react";

export function ExportButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onExport() {
    const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    const email = process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    if (!base || !email) {
      setMessage("Missing NEXT_PUBLIC admin env.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/export?eventId=${encodeURIComponent(eventId)}`, {
        method: "GET",
        headers: {
          "x-admin-email": email
        }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setMessage(err?.message ?? "Export failed.");
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
      setMessage("CSV downloaded.");
    } catch {
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onExport} disabled={loading}>
        {loading ? "Exporting..." : "Export CSV"}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
