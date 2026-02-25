"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAdminApiBase } from "../_lib/admin-client";
import { Button } from "./ui/button";

export function LogoutButton() {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    const base = getClientAdminApiBase();
    if (!base) return;

    setLoading(true);
    try {
      await fetch(`${base}/api/admin/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      setLoading(false);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleLogout} loading={loading}>
      {loading ? (ru ? "Выход..." : "Logging out...") : (ru ? "Выйти" : "Log out")}
    </Button>
  );
}
