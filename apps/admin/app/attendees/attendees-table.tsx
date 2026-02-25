"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AttendeeItem } from "../_lib/admin-api";
import { getUiLocale, ui } from "../i18n";
import { AttendeeDrawer } from "./attendee-drawer";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "../_lib/admin-client";

interface AttendeesTableProps {
  eventId: string;
  organizationId?: string;
  attendees: AttendeeItem[];
  density?: "comfortable" | "compact";
}

interface QuestionColumn {
  id: string;
  prompt: string;
}

const COLOR_PRESETS = ["#FFE5E5", "#FFF1CC", "#E9FAD8", "#DDF4FF", "#EFE6FF", "#FCE7F3"];

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

function hexToRgba(hex: string, alpha: number): string {
  const safeHex = hex.replace("#", "");
  const r = Number.parseInt(safeHex.slice(0, 2), 16);
  const g = Number.parseInt(safeHex.slice(2, 4), 16);
  const b = Number.parseInt(safeHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function AttendeesTable({ eventId, organizationId, attendees, density = "comfortable" }: AttendeesTableProps) {
  const locale = getUiLocale();
  const [rows, setRows] = useState<AttendeeItem[]>(attendees);
  const [lastPersistedRows, setLastPersistedRows] = useState<AttendeeItem[]>(attendees);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"ok" | "error" | "info" | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const colorTimerByUserRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setRows(attendees);
    setLastPersistedRows(attendees);
  }, [attendees]);

  useEffect(() => {
    const colorTimers = colorTimerByUserRef.current;
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      for (const timerId of colorTimers.values()) {
        window.clearTimeout(timerId);
      }
      colorTimers.clear();
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
    const base = getClientAdminApiBase();

    if (!base) {
      setMessageType("error");
      setMessage(missingClientApiBaseMessage(locale === "ru"));
      setRows(lastPersistedRows);
      return;
    }

    setMessageType("info");
    setMessage(ui("attendees_order_saving", locale));

    try {
      const response = await fetch(`${base}/api/admin/attendees`, {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          ...(organizationId ? { organizationId } : {}),
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

  async function persistRowColor(
    userId: string,
    rowColor: string | null,
    nextRows: AttendeeItem[],
    previousRows: AttendeeItem[]
  ) {
    const base = getClientAdminApiBase();

    if (!base) {
      setMessageType("error");
      setMessage(missingClientApiBaseMessage(locale === "ru"));
      setRows(previousRows);
      return;
    }

    setMessageType("info");
    setMessage(ui("attendees_color_saving", locale));

    try {
      const response = await fetch(`${base}/api/admin/attendees`, {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          ...(organizationId ? { organizationId } : {}),
          eventId,
          colorUpdate: {
            userId,
            rowColor
          }
        })
      });

      if (!response.ok) throw new Error("save_failed");
      setLastPersistedRows(nextRows);
      setMessageType("ok");
      setMessage(ui("attendees_color_saved", locale));
    } catch {
      setRows(previousRows);
      setLastPersistedRows(previousRows);
      setMessageType("error");
      setMessage(ui("attendees_color_save_failed", locale));
    }
  }

  function schedulePersistRowColor(userId: string, rowColor: string | null, nextRows: AttendeeItem[], previousRows: AttendeeItem[]) {
    const previousTimerId = colorTimerByUserRef.current.get(userId);
    if (previousTimerId !== undefined) {
      window.clearTimeout(previousTimerId);
    }

    const timerId = window.setTimeout(() => {
      void persistRowColor(userId, rowColor, nextRows, previousRows);
      colorTimerByUserRef.current.delete(userId);
    }, 350);

    colorTimerByUserRef.current.set(userId, timerId);
  }

  function handleRowColorChange(userId: string, rowColor: string | null) {
    const previousRows = rows;
    const nextRows = rows.map((item) => (item.userId === userId ? { ...item, rowColor } : item));
    setRows(nextRows);
    schedulePersistRowColor(userId, rowColor, nextRows, previousRows);
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
        <table className={`attendees-table${density === "compact" ? " compact" : ""}`}>
          <thead>
            <tr>
              <th className="attendees-col-drag sticky-col-1">{ui("attendees_column_drag", locale)}</th>
              <th className="attendees-col-color sticky-col-2">{ui("attendees_color", locale)}</th>
              <th className="attendees-col-name sticky-col-3">{ui("attendees_column_name", locale)}</th>
              <th className="attendees-col-username">{ui("attendees_column_username", locale)}</th>
              <th>{ui("attendees_column_status", locale)}</th>
              <th>{ui("attendees_column_checked_in", locale)}</th>
              {columns.map((column) => (
                <th key={column.id} title={column.prompt}>
                  <span className="th-clamp">{column.prompt}</span>
                </th>
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
                  style={attendee.rowColor ? { backgroundColor: hexToRgba(attendee.rowColor, 0.3) } : undefined}
                >
                  <td className="sticky-col-1">
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
                  <td className="sticky-col-2">
                    <div className="row-color-controls" onClick={(event) => event.stopPropagation()}>
                      <div className="row-color-presets">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={`${attendee.userId}-${color}`}
                            type="button"
                            className="row-color-preset"
                            style={{ backgroundColor: color }}
                            onClick={() => handleRowColorChange(attendee.userId, color)}
                            aria-label={`${ui("attendees_color", locale)} ${color}`}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={attendee.rowColor ?? "#DDF4FF"}
                        onChange={(event) => handleRowColorChange(attendee.userId, event.target.value.toUpperCase())}
                        aria-label={ui("attendees_color_custom", locale)}
                      />
                      <button
                        type="button"
                        className="row-color-clear"
                        onClick={() => handleRowColorChange(attendee.userId, null)}
                      >
                        {ui("attendees_color_clear", locale)}
                      </button>
                    </div>
                  </td>
                  <td className="sticky-col-3">{attendee.fullName}</td>
                  <td className="attendees-col-username">{attendee.username ? `@${attendee.username}` : "-"}</td>
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
