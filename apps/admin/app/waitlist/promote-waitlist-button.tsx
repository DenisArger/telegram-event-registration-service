"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { promoteWaitlistAttendee } from "../_lib/admin-client";
import { Button } from "../_components/ui/button";
import { InlineAlert } from "../_components/ui/inline-alert";

export function PromoteWaitlistButton({
  eventId,
  userId,
  organizationId
}: {
  eventId: string;
  userId: string;
  organizationId?: string;
}) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function promote() {
    setLoading(true);
    setMessage(null);
    try {
      console.debug("[waitlist-promote] button click", { eventId, userId, organizationId });
      const result = await promoteWaitlistAttendee(eventId, userId, organizationId);
      console.debug("[waitlist-promote] button result", { eventId, userId, organizationId, result });
      if (result?.status === "promoted") {
        setMessage(ru ? "Участник переведён в список участников." : "Moved to attendees.");
        router.refresh();
        return;
      }
      if (result?.status === "empty_waitlist") {
        setMessage(ru ? "Лист ожидания пуст." : "Waitlist is empty.");
        return;
      }
      setMessage(ru ? "Не удалось перевести участника." : "Could not move participant.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button onClick={promote} loading={loading} variant="secondary" className="whitespace-nowrap">
        {loading ? (ru ? "Выполняется..." : "Moving...") : ru ? "В участники" : "Move to attendees"}
      </Button>
      {message ? <InlineAlert message={message} tone="info" /> : null}
    </div>
  );
}
