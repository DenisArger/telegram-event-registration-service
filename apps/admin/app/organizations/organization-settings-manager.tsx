"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationItem } from "../_lib/admin-api";
import { Button } from "../_components/ui/button";
import { InlineAlert } from "../_components/ui/inline-alert";

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
    const name = createName.trim();
    if (!name) {
      setMessage(ru ? "Укажите название организации." : "Organization name is required.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/organizations", {
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
      const response = await fetch("/api/admin/organizations", {
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
    <section className="panel">
      <h2>{ru ? "Настройки организации" : "Organization settings"}</h2>

      <div className="mt-4 grid gap-3">
        <strong>{ru ? "Создать организацию" : "Create organization"}</strong>
        <div className="grid gap-2 sm:grid-cols-3">
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
          <Button onClick={createOrganization} loading={loading} variant="primary">
            {loading ? (ru ? "Создание..." : "Creating...") : (ru ? "Создать" : "Create")}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <strong>{ru ? "Редактировать выбранную организацию" : "Edit selected organization"}</strong>
        <div className="grid gap-2 sm:grid-cols-4">
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
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={clearToken}
              onChange={(e) => setClearToken(e.target.checked)}
              disabled={!selectedOrganizationId}
              className="h-4 w-4"
            />
            {ru ? "Очистить токен" : "Clear token"}
          </label>
          <Button onClick={updateOrganization} loading={loading} disabled={!selectedOrganizationId}>
            {loading ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
          </Button>
        </div>
      </div>

      {message ? <div className="mt-4"><InlineAlert message={message} /></div> : null}
    </section>
  );
}
