"use client";

import { useState } from "react";

export function PromoteButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function promote() {
    const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    const email = process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    if (!base || !email) {
      setMessage("Missing NEXT_PUBLIC admin env.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/promote`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({ eventId })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? "Promotion failed.");
        return;
      }

      if (data?.status === "empty_waitlist") {
        setMessage("Waitlist is empty.");
        return;
      }

      setMessage(`Promoted user: ${data?.user_id ?? "unknown"}`);
    } catch {
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={promote} disabled={loading}>
        {loading ? "Promoting..." : "Promote next from waitlist"}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
