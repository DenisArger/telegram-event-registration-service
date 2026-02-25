import React from "react";
import { OrganizationSelector } from "../_components/organization-selector";
import { getAuthMe, getOrganizationMembers } from "../_lib/admin-api";
import { resolveSelectedOrganizationId } from "../_lib/event-selection";
import { getUiLocale, ui } from "../i18n";
import { OrganizationMembersManager } from "./organization-members-manager";
import { OrganizationSettingsManager } from "./organization-settings-manager";
import { EmptyState } from "../_components/ui/empty-state";
import { PageHeader } from "../_components/ui/page-header";
import { Panel } from "../_components/ui/panel";

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
    <>
      <PageHeader title={ui("organizations", locale)} subtitle={ui("organizations_subtitle", locale)} />

      <Panel compact>
        <OrganizationSelector
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          basePath="/organizations"
        />
      </Panel>

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
        <Panel>
          <EmptyState message={ui("no_organization_selected", locale)} />
        </Panel>
      )}
    </>
  );
}
