"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAdminApiBase, missingClientApiBaseMessage } from "../_lib/admin-client";

declare global {
  interface Window {
    onTelegramAdminAuth?: (user: Record<string, unknown>) => void;
  }
}

export default function LoginPage() {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const apiBase = getClientAdminApiBase();

  useEffect(() => {
    if (!botUsername) {
      setMessage(ru ? "Не задан NEXT_PUBLIC_TELEGRAM_BOT_USERNAME." : "Missing NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.");
      return;
    }
    if (!apiBase) {
      setMessage(missingClientApiBaseMessage(ru));
      return;
    }

    window.onTelegramAdminAuth = async (user) => {
      setMessage(null);
      try {
        const response = await fetch(`${apiBase}/api/admin/auth/telegram`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify(user)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(String(data?.message ?? (ru ? "Ошибка входа." : "Login failed.")));
          return;
        }
        router.push("/");
        router.refresh();
      } catch {
        setMessage(ru ? "Сетевая ошибка." : "Network error.");
      }
    };

    const container = document.getElementById("telegram-login-container");
    if (!container) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAdminAuth(user)");
    container.appendChild(script);
  }, [apiBase, botUsername, router, ru]);

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ru ? "Вход в админку" : "Admin login"}</h1>
        <p>{ru ? "Войдите через Telegram, чтобы открыть панель управления." : "Sign in with Telegram to access admin panel."}</p>
        <div id="telegram-login-container" />
        {message ? <p>{message}</p> : null}
      </section>
    </div>
  );
}
