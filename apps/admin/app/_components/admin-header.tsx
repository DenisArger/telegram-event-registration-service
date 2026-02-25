"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUiLocale, ui } from "../i18n";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", labelKey: "nav_dashboard" },
  { href: "/events", labelKey: "nav_events" },
  { href: "/attendees", labelKey: "nav_attendees" },
  { href: "/waitlist", labelKey: "nav_waitlist" },
  { href: "/stats", labelKey: "nav_stats" },
  { href: "/actions", labelKey: "nav_actions" },
  { href: "/organizations", labelKey: "nav_organizations" }
] as const;

export function AdminHeader() {
  const pathname = usePathname();
  const locale = getUiLocale();
  const [open, setOpen] = useState(false);
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-20 border-b border-border/90 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto text-sm font-bold text-text no-underline sm:text-base">
          {ui("title", locale)}
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Admin navigation">
          {links.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm no-underline transition ${isActive ? "bg-accent/15 text-text" : "text-muted hover:bg-surface-elevated hover:text-text"}`}
              >
                {ui(link.labelKey, locale)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          <ThemeToggle />
          <LogoutButton />
        </div>

        <button
          type="button"
          className="lg:hidden"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface lg:hidden" role="dialog" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-[1280px] gap-1 px-4 py-3 sm:px-6">
            {links.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 no-underline ${isActive ? "bg-accent/15 text-text" : "text-muted"}`}
                >
                  {ui(link.labelKey, locale)}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center gap-2">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
