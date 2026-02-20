import Link from "next/link";
import React from "react";
import { getHealth } from "./_lib/admin-api";
import { getUiLocale, ui } from "./i18n";

const quickLinks = [
  { href: "/events", titleKey: "events", subtitleKey: "quick_events" },
  { href: "/attendees", titleKey: "attendees", subtitleKey: "quick_attendees" },
  { href: "/waitlist", titleKey: "waitlist", subtitleKey: "quick_waitlist" },
  { href: "/stats", titleKey: "stats", subtitleKey: "quick_stats" },
  { href: "/actions", titleKey: "actions", subtitleKey: "quick_actions" }
] as const;

export default async function HomePage() {
  const locale = getUiLocale();
  const health = await getHealth();

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ui("dashboard_title", locale)}</h1>
        <p>{ui("dashboard_subtitle", locale)}</p>
      </section>

      <section className="card">
        <h2>{ui("system_status", locale)}</h2>
        <p>{ui("bot_health", locale)}: {health}</p>
      </section>

      <section className="quick-links">
        {quickLinks.map((item) => (
          <article key={item.href} className="card quick-link-card">
            <h3>{ui(item.titleKey, locale)}</h3>
            <p>{ui(item.subtitleKey, locale)}</p>
            <Link href={item.href}>{ui("open_section", locale)}</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
