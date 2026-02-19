"use client";

import React, { useEffect } from "react";
import type { AttendeeItem } from "../_lib/admin-api";
import { getUiLocale, ui } from "../i18n";

interface AttendeeDrawerProps {
  attendee: AttendeeItem | null;
  onClose: () => void;
}

export function AttendeeDrawer({ attendee, onClose }: AttendeeDrawerProps) {
  const locale = getUiLocale();

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

  if (!attendee) return null;

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
      </aside>
    </div>
  );
}
