import Link from "next/link";
import React from "react";
import { getHealth } from "./_lib/admin-api";
import { getUiLocale, ui } from "./i18n";
import { Badge } from "./_components/ui/badge";
import { PageHeader } from "./_components/ui/page-header";
import { Panel } from "./_components/ui/panel";

const quickLinks = [
  { href: "/events", titleKey: "events", subtitleKey: "quick_events" },
  { href: "/attendees", titleKey: "attendees", subtitleKey: "quick_attendees" },
  { href: "/waitlist", titleKey: "waitlist", subtitleKey: "quick_waitlist" },
  { href: "/stats", titleKey: "stats", subtitleKey: "quick_stats" },
  { href: "/actions", titleKey: "actions", subtitleKey: "quick_actions" },
  { href: "/organizations", titleKey: "organizations", subtitleKey: "quick_organizations" }
] as const;

export default async function HomePage() {
  const locale = getUiLocale();
  const health = await getHealth();

  return (
    <>
      <PageHeader title={ui("dashboard_title", locale)} subtitle={ui("dashboard_subtitle", locale)} />

      <Panel className="animate-fade-up">
        <div className="flex items-center justify-between gap-2">
          <h2>{ui("system_status", locale)}</h2>
          <Badge tone={health === "ok" ? "success" : "danger"}>{health}</Badge>
        </div>
        <p>{ui("bot_health", locale)}</p>
      </Panel>

      <section className="quick-links animate-fade-up" aria-label="quick-links">
        {quickLinks.map((item) => (
          <article key={item.href} className="quick-link-card">
            <h3>{ui(item.titleKey, locale)}</h3>
            <p>{ui(item.subtitleKey, locale)}</p>
            <Link href={item.href} className="text-sm font-medium no-underline">
              {ui("open_section", locale)}
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
