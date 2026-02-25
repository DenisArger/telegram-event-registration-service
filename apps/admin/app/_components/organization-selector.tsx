"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { OrganizationItem } from "../_lib/admin-api";
import { getUiLocale } from "../i18n";
import { EmptyState } from "./ui/empty-state";
import { Field, Select } from "./ui/field";

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
  const locale = getUiLocale();
  const orgLabel = locale === "ru" ? "Организация" : "Organization";

  if (organizations.length === 0) {
    return <EmptyState message={locale === "ru" ? "Нет организаций." : "No organizations available."} />;
  }

  return (
    <Field label={orgLabel}>
      <Select
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
      </Select>
    </Field>
  );
}
