"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { OrganizationItem } from "../_lib/admin-api";

interface OrganizationSelectorProps {
  organizations: OrganizationItem[];
  selectedOrganizationId: string | null;
  basePath: string;
  eventId?: string | null;
  view?: string | null;
}

export function OrganizationSelector({
  organizations,
  selectedOrganizationId,
  basePath,
  eventId,
  view
}: OrganizationSelectorProps) {
  const router = useRouter();

  if (organizations.length === 0) {
    return <p>No organizations available.</p>;
  }

  return (
    <label className="event-selector">
      <span>Organization:</span>
      <select
        value={selectedOrganizationId ?? organizations[0]?.id ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams();
          params.set("organizationId", e.target.value);
          if (eventId) params.set("eventId", eventId);
          if (view) params.set("view", view);
          router.push(`${basePath}?${params.toString()}`);
        }}
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
