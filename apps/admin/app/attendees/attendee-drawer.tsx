"use client";

import React, { useEffect } from "react";
import type { AttendeeItem } from "../_lib/admin-api";
import { cancelAttendeeRegistration } from "../_lib/admin-client";
import { getUiLocale, ui } from "../i18n";

interface AttendeeDrawerProps {
  attendee: AttendeeItem | null;
  onClose: () => void;
  eventId: string;
  organizationId?: string;
  onAttendeeCancelled?: (userId: string) => void;
}

export function AttendeeDrawer({ attendee, onClose, eventId, organizationId, onAttendeeCancelled }: AttendeeDrawerProps) {
  const locale = getUiLocale();
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  useEffect(() => {
    if (!attendee) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [attendee, onClose]);

  useEffect(() => {
    setIsCancelling(false);
    setActionMessage(null);
  }, [attendee]);

  if (!attendee) return null;

  async function handleCancelRegistration() {
    if (!attendee || isCancelling) return;
    const confirmed = window.confirm(
      locale === "ru"
        ? "Отменить регистрацию участника? Он будет снят с события."
        : "Cancel this attendee's registration? They will be removed from the event."
    );
    if (!confirmed) return;

    setIsCancelling(true);
    setActionMessage(null);
    const ok = await cancelAttendeeRegistration(eventId, attendee.userId, organizationId);
    setIsCancelling(false);
    if (!ok) {
      setActionMessage(locale === "ru" ? "Не удалось отменить регистрацию." : "Failed to cancel registration.");
      return;
    }

    onAttendeeCancelled?.(attendee.userId);
    onClose();
  }

  return (
    <div className="attendee-drawer-overlay" onClick={onClose} role="presentation">
      <aside
        className="attendee-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={ui("attendees_details_title", locale)}
      >
        <div className="attendee-drawer-header">
          <h3>{ui("attendees_details_title", locale)}</h3>
          <button type="button" onClick={onClose}>
            {ui("attendees_close_details", locale)}
          </button>
        </div>

        <div className="attendee-drawer-meta">
          <p><strong>{ui("attendees_column_name", locale)}:</strong> {attendee.fullName}</p>
          <p><strong>{ui("attendees_column_username", locale)}:</strong> {attendee.username ? `@${attendee.username}` : "-"}</p>
          <p><strong>{ui("attendees_details_user_id", locale)}:</strong> {attendee.userId}</p>
          <p><strong>{ui("attendees_column_status", locale)}:</strong> {attendee.status}</p>
          <p><strong>{ui("attendees_column_checked_in", locale)}:</strong> {attendee.checkedIn ? "yes" : "no"}</p>
          <p>
            <strong>{ui("attendees_details_registered_at", locale)}:</strong> {new Date(attendee.registeredAt).toLocaleString()}
          </p>
        </div>

        <div>
          <h4>{ui("attendees_details_answers", locale)}</h4>
          {(attendee.answers ?? []).length === 0 ? (
            <p>{ui("attendees_no_answers", locale)}</p>
          ) : (
            <ul>
              {(attendee.answers ?? []).map((answer) => (
                <li key={`${attendee.userId}-${answer.questionId}-${answer.questionVersion}`}>
                  {answer.prompt}: {answer.isSkipped ? ui("skipped", locale) : answer.answerText ?? ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          {actionMessage ? <p className="mb-3 text-sm text-red-600">{actionMessage}</p> : null}
          <button
            type="button"
            onClick={handleCancelRegistration}
            disabled={isCancelling || attendee.status === "cancelled"}
            className="rounded-xl border border-red-400 px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCancelling
              ? locale === "ru"
                ? "Отменяем..."
                : "Cancelling..."
              : locale === "ru"
                ? "Отменить регистрацию"
                : "Cancel registration"}
          </button>
        </div>
      </aside>
    </div>
  );
}
