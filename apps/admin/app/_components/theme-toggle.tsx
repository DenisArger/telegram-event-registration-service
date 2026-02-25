"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("admin_theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = getInitialTheme();
    setTheme(current);
    document.documentElement.dataset.theme = current;
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("admin_theme", nextTheme);
  }

  return (
    <Button type="button" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
      Theme: {theme === "light" ? "Dark" : "Light"}
    </Button>
  );
}
