"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationItem } from "../_lib/admin-api";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "../_lib/admin-client";

interface OrganizationSettingsManagerProps {
  organizations: OrganizationItem[];
  selectedOrganizationId: string | null;
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function OrganizationSettingsManager({
  organizations,
  selectedOrganizationId
}: OrganizationSettingsManagerProps) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createToken, setCreateToken] = useState("");

  const selectedOrg = useMemo(
    () => organizations.find((item) => item.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  );
  const [editName, setEditName] = useState("");
  const [editToken, setEditToken] = useState("");
  const [clearToken, setClearToken] = useState(false);

  useEffect(() => {
    setEditName(selectedOrg?.name ?? "");
    setEditToken("");
    setClearToken(false);
  }, [selectedOrg?.id, selectedOrg?.name]);

  async function createOrganization() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }
    const name = createName.trim();
    if (!name) {
      setMessage(ru ? "Укажите название организации." : "Organization name is required.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/organizations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          ...(createToken.trim() ? { telegramBotToken: createToken.trim() } : {})
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(parseErrorMessage(data, ru ? "Не удалось создать организацию." : "Failed to create organization."));
        return;
      }
      const newOrgId = String(data?.organization?.id ?? "");
      setCreateName("");
      setCreateToken("");
      if (newOrgId) {
        router.push(`/organizations?organizationId=${newOrgId}`);
      }
      router.refresh();
      setMessage(ru ? "Организация создана." : "Organization created.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrganization() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }
    if (!selectedOrganizationId) {
      setMessage(ru ? "Организация не выбрана." : "No organization selected.");
      return;
    }

    const payload: Record<string, unknown> = {
      organizationId: selectedOrganizationId
    };
    const name = editName.trim();
    if (name && name !== selectedOrg?.name) {
      payload.name = name;
    }
    if (clearToken) {
      payload.telegramBotToken = null;
    } else if (editToken.trim()) {
      payload.telegramBotToken = editToken.trim();
    }

    if (Object.keys(payload).length === 1) {
      setMessage(ru ? "Нет изменений для сохранения." : "No changes to save.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/organizations`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(parseErrorMessage(data, ru ? "Не удалось обновить организацию." : "Failed to update organization."));
        return;
      }
      setEditToken("");
      setClearToken(false);
      router.refresh();
      setMessage(ru ? "Организация обновлена." : "Organization updated.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>{ru ? "Настройки организации" : "Organization settings"}</h2>

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <strong>{ru ? "Создать организацию" : "Create organization"}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder={ru ? "Название" : "Name"}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Telegram bot token (optional)"
            value={createToken}
            onChange={(e) => setCreateToken(e.target.value)}
          />
          <button onClick={createOrganization} disabled={loading}>
            {loading ? (ru ? "Создание..." : "Creating...") : (ru ? "Создать" : "Create")}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <strong>{ru ? "Редактировать выбранную организацию" : "Edit selected organization"}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder={ru ? "Название" : "Name"}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={!selectedOrganizationId}
          />
          <input
            type="text"
            placeholder="New Telegram bot token (optional)"
            value={editToken}
            onChange={(e) => setEditToken(e.target.value)}
            disabled={!selectedOrganizationId || clearToken}
          />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={clearToken}
              onChange={(e) => setClearToken(e.target.checked)}
              disabled={!selectedOrganizationId}
            />
            {ru ? "Очистить токен" : "Clear token"}
          </label>
          <button onClick={updateOrganization} disabled={loading || !selectedOrganizationId}>
            {loading ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
          </button>
        </div>
      </div>

      {message ? <p>{message}</p> : null}
    </section>
  );
}
