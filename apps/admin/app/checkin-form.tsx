"use client";

import { useState } from "react";

export function CheckInForm() {
  const [eventId, setEventId] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    const email = process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;
    if (!base || !email) {
      setMessage("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL or NEXT_PUBLIC_ADMIN_REQUEST_EMAIL.");
      return;
    }
    if (!eventId || !userId) {
      setMessage("eventId and userId are required.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${base}/api/admin/checkin`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({
          eventId,
          userId,
          method: "manual"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? "Check-in failed.");
        return;
      }

      setMessage(data?.status === "already_checked_in" ? "Already checked in." : "Check-in successful.");
    } catch {
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p>Manual check-in</p>
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
          {loading ? "Checking in..." : "Check in attendee"}
        </button>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}
