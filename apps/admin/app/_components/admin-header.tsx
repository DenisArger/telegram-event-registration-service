"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUiLocale, ui } from "../i18n";

const links = [
  { href: "/", labelKey: "nav_dashboard" },
  { href: "/events", labelKey: "nav_events" },
  { href: "/attendees", labelKey: "nav_attendees" },
  { href: "/waitlist", labelKey: "nav_waitlist" },
  { href: "/stats", labelKey: "nav_stats" },
  { href: "/checkin", labelKey: "nav_checkin" },
  { href: "/actions", labelKey: "nav_actions" }
] as const;

export function AdminHeader() {
  const pathname = usePathname();
  const locale = getUiLocale();

  return (
    <header className="admin-header">
      <div className="admin-header-inner">
        <Link href="/" className="admin-brand">{ui("title", locale)}</Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          {links.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`admin-nav-link${isActive ? " active" : ""}`}
              >
                {ui(link.labelKey, locale)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
