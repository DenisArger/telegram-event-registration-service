import React from "react";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAuthMe, getOrganizationMembers } from "../_lib/admin-api";
import { resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { OrganizationMembersManager } from "./organization-members-manager";
import { OrganizationSettingsManager } from "./organization-settings-manager";

export default async function OrganizationsPage({
  searchParams
}: {
  searchParams?: Promise<{ organizationId?: string | string[] }>;
}) {
  const locale = getUiLocale();
  const me = await getAuthMe();
  const organizations = me?.organizations ?? [];
  const resolvedSearchParams = await searchParams;
  const selectedOrganizationId = resolveSelectedOrganizationId(resolvedSearchParams, organizations);
  const members = await getOrganizationMembers(selectedOrganizationId ?? undefined);

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("organizations", locale)}</h1>
        <p>{ui("organizations_subtitle", locale)}</p>
      </section>

      <section className="card">
        <OrganizationSelector
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          basePath="/organizations"
        />
      </section>

      <OrganizationSettingsManager
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
      />

      {selectedOrganizationId ? (
        <OrganizationMembersManager
          organizationId={selectedOrganizationId}
          currentUserId={me?.userId}
          initialMembers={members}
        />
      ) : (
        <section className="card">
          <p>{ui("no_organization_selected", locale)}</p>
        </section>
      )}
    </div>
  );
}
