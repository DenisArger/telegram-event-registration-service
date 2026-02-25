"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { OrganizationMemberItem } from "../_lib/admin-api";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "../_lib/admin-client";

interface OrganizationMembersManagerProps {
  organizationId: string;
  currentUserId?: string;
  initialMembers: OrganizationMemberItem[];
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export function OrganizationMembersManager({
  organizationId,
  currentUserId,
  initialMembers
}: OrganizationMembersManagerProps) {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const [members, setMembers] = useState<OrganizationMemberItem[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "admin">("admin");
  const [newOwnerUserId, setNewOwnerUserId] = useState("");

  useEffect(() => {
    setMembers(initialMembers);
    setMessage(null);
  }, [initialMembers, organizationId]);

  const ownerCount = useMemo(() => members.filter((item) => item.role === "owner").length, [members]);
  const nonOwnerCandidates = useMemo(
    () => members.filter((item) => item.role !== "owner"),
    [members]
  );

  async function refreshMembers(base: string): Promise<void> {
    const url = new URL("/api/admin/organization-members", base);
    url.searchParams.set("organizationId", organizationId);
    const response = await fetch(url.toString(), { credentials: "include" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(parseErrorMessage(data, ru ? "Не удалось загрузить участников." : "Failed to load organization members."));
    }
    setMembers((data?.members ?? []) as OrganizationMemberItem[]);
  }

  async function saveMember() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }
    const userId = memberUserId.trim();
    if (!userId) {
      setMessage(ru ? "Укажите userId." : "userId is required.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/organization-members`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId, userId, role: memberRole })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(parseErrorMessage(data, ru ? "Не удалось сохранить участника." : "Failed to save member."));
        return;
      }
      setMemberUserId("");
      await refreshMembers(base);
      setMessage(ru ? "Участник сохранен." : "Member saved.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function saveMemberByRole(userId: string, role: "owner" | "admin") {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }
    if (!userId.trim()) {
      setMessage(ru ? "Укажите userId." : "userId is required.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/organization-members`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId, userId: userId.trim(), role })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(parseErrorMessage(data, ru ? "Не удалось сохранить участника." : "Failed to save member."));
        return;
      }
      await refreshMembers(base);
      setMessage(ru ? "Роль обновлена." : "Role updated.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMember(userId: string) {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }
    const confirmed = window.confirm(ru ? "Удалить участника из организации?" : "Remove member from organization?");
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/organization-members`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId, userId })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(parseErrorMessage(data, ru ? "Не удалось удалить участника." : "Failed to delete member."));
        return;
      }
      await refreshMembers(base);
      setMessage(ru ? "Участник удален." : "Member removed.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function transferOwnership() {
    const base = getClientAdminApiBase();
    if (!base) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }
    const targetUserId = newOwnerUserId.trim();
    if (!targetUserId) {
      setMessage(ru ? "Укажите userId нового владельца." : "newOwnerUserId is required.");
      return;
    }
    const confirmed = window.confirm(ru ? "Передать ownership выбранному участнику?" : "Transfer ownership to selected member?");
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/api/admin/organization-transfer-ownership`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId, newOwnerUserId: targetUserId })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(parseErrorMessage(data, ru ? "Не удалось передать ownership." : "Ownership transfer failed."));
        return;
      }
      setNewOwnerUserId("");
      await refreshMembers(base);
      setMessage(ru ? "Ownership передан." : "Ownership transferred.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>{ru ? "Участники организации" : "Organization members"}</h2>
      <p>{ru ? `Owners: ${ownerCount}.` : `Owners: ${ownerCount}.`}</p>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <strong>{ru ? "Добавить/обновить участника" : "Add or update member"}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="userId (uuid)"
            value={memberUserId}
            onChange={(e) => setMemberUserId(e.target.value)}
          />
          <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as "owner" | "admin")}>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <button onClick={saveMember} disabled={loading}>
            {loading ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <strong>{ru ? "Передать ownership" : "Transfer ownership"}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={newOwnerUserId} onChange={(e) => setNewOwnerUserId(e.target.value)}>
            <option value="">{ru ? "Выберите участника" : "Select member"}</option>
            {nonOwnerCandidates.map((candidate) => (
              <option key={candidate.userId} value={candidate.userId}>
                {(candidate.fullName || candidate.username || candidate.userId) + ` (${candidate.userId})`}
              </option>
            ))}
          </select>
          <button onClick={transferOwnership} disabled={loading}>
            {loading ? (ru ? "Передача..." : "Transferring...") : (ru ? "Передать" : "Transfer")}
          </button>
        </div>
      </div>

      {members.length === 0 ? <p>{ru ? "Нет участников." : "No members."}</p> : null}
      {members.length > 0 ? (
        <div className="attendees-table-wrap">
          <table className="attendees-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>{ru ? "Имя" : "Name"}</th>
                <th>Username</th>
                <th>Telegram</th>
                <th>Role</th>
                <th>{ru ? "Действия" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId}>
                  <td>{member.userId}</td>
                  <td>{member.fullName ?? "-"}</td>
                  <td>{member.username ?? "-"}</td>
                  <td>{member.telegramId ?? "-"}</td>
                  <td>{member.role}</td>
                  <td>
                    {member.role === "admin" ? (
                      <button
                        onClick={() => saveMemberByRole(member.userId, "owner")}
                        disabled={loading}
                        style={{ marginRight: 6 }}
                      >
                        {ru ? "Сделать owner" : "Promote to owner"}
                      </button>
                    ) : (
                      <button
                        onClick={() => saveMemberByRole(member.userId, "admin")}
                        disabled={loading}
                        style={{ marginRight: 6 }}
                      >
                        {ru ? "Сделать admin" : "Demote to admin"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteMember(member.userId)}
                      disabled={loading || member.userId === currentUserId}
                      title={member.userId === currentUserId ? (ru ? "Нельзя удалить себя." : "Cannot remove yourself.") : ""}
                    >
                      {ru ? "Удалить" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {message ? <p>{message}</p> : null}
    </section>
  );
}
