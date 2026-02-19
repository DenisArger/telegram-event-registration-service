"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AttendeeItem } from "../_lib/admin-api";
import { getUiLocale, ui } from "../i18n";
import { AttendeeDrawer } from "./attendee-drawer";

interface AttendeesTableProps {
  eventId: string;
  attendees: AttendeeItem[];
}

interface QuestionColumn {
  id: string;
  prompt: string;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export function AttendeesTable({ eventId, attendees }: AttendeesTableProps) {
  const locale = getUiLocale();
  const [rows, setRows] = useState<AttendeeItem[]>(attendees);
  const [lastPersistedRows, setLastPersistedRows] = useState<AttendeeItem[]>(attendees);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"ok" | "error" | "info" | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setRows(attendees);
    setLastPersistedRows(attendees);
  }, [attendees]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const columns = useMemo<QuestionColumn[]>(() => {
    const byId = new Map<string, string>();
    for (const attendee of rows) {
      for (const answer of attendee.answers ?? []) {
        if (!byId.has(answer.questionId)) {
          byId.set(answer.questionId, answer.prompt);
        }
      }
    }

    return Array.from(byId.entries()).map(([id, prompt]) => ({ id, prompt }));
  }, [rows]);

  const selectedAttendee = rows.find((row) => row.userId === selectedUserId) ?? null;

  async function persistOrder(nextRows: AttendeeItem[]) {
    const base = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    const email = process.env.NEXT_PUBLIC_ADMIN_REQUEST_EMAIL;

    if (!base || !email) {
      setMessageType("error");
      setMessage("Missing NEXT_PUBLIC_ADMIN_API_BASE_URL or NEXT_PUBLIC_ADMIN_REQUEST_EMAIL.");
      setRows(lastPersistedRows);
      return;
    }

    setMessageType("info");
    setMessage(ui("attendees_order_saving", locale));

    try {
      const response = await fetch(`${base}/api/admin/attendees`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({
          eventId,
          orderedUserIds: nextRows.map((item) => item.userId)
        })
      });

      if (!response.ok) {
        throw new Error("save_failed");
      }

      setLastPersistedRows(nextRows);
      setMessageType("ok");
      setMessage(ui("attendees_order_saved", locale));
    } catch {
      setRows(lastPersistedRows);
      setMessageType("error");
      setMessage(ui("attendees_order_save_failed", locale));
    }
  }

  function schedulePersist(nextRows: AttendeeItem[]) {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistOrder(nextRows);
    }, 500);
  }

  function handleDrop(targetUserId: string) {
    if (!draggingUserId || draggingUserId === targetUserId) return;

    const fromIndex = rows.findIndex((row) => row.userId === draggingUserId);
    const toIndex = rows.findIndex((row) => row.userId === targetUserId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextRows = moveItem(rows, fromIndex, toIndex);
    setRows(nextRows);
    setDraggingUserId(null);
    schedulePersist(nextRows);
  }

  return (
    <>
      {message ? <p className={`attendees-order-message ${messageType ?? "info"}`}>{message}</p> : null}
      <div className="attendees-table-wrap">
        <table className="attendees-table">
          <thead>
            <tr>
              <th>{ui("attendees_column_drag", locale)}</th>
              <th>{ui("attendees_column_name", locale)}</th>
              <th>{ui("attendees_column_username", locale)}</th>
              <th>{ui("attendees_column_status", locale)}</th>
              <th>{ui("attendees_column_checked_in", locale)}</th>
              {columns.map((column) => (
                <th key={column.id}>{column.prompt}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((attendee) => {
              const answerByQuestionId = new Map((attendee.answers ?? []).map((answer) => [answer.questionId, answer]));
              return (
                <tr
                  key={attendee.userId}
                  onClick={() => setSelectedUserId(attendee.userId)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(attendee.userId)}
                  data-testid={`attendee-row-${attendee.userId}`}
                  className={draggingUserId === attendee.userId ? "attendees-row-dragging" : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="drag-handle"
                      draggable
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.setData("text/plain", attendee.userId);
                        setDraggingUserId(attendee.userId);
                      }}
                      onDragEnd={() => setDraggingUserId(null)}
                      aria-label={ui("attendees_column_drag", locale)}
                    >
                      ⋮⋮
                    </button>
                  </td>
                  <td>{attendee.fullName}</td>
                  <td>{attendee.username ? `@${attendee.username}` : "-"}</td>
                  <td>{attendee.status}</td>
                  <td>{attendee.checkedIn ? "yes" : "no"}</td>
                  {columns.map((column) => {
                    const answer = answerByQuestionId.get(column.id);
                    const value = !answer ? "" : answer.isSkipped ? ui("skipped", locale) : answer.answerText ?? "";
                    return <td key={`${attendee.userId}-${column.id}`}>{value}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AttendeeDrawer attendee={selectedAttendee} onClose={() => setSelectedUserId(null)} />
    </>
  );
}
