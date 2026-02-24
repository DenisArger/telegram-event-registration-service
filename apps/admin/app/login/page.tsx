"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    onTelegramAdminAuth?: (user: Record<string, unknown>) => void;
  }
}

export default function LoginPage() {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [devTelegramId, setDevTelegramId] = useState("");
  const [devLoading, setDevLoading] = useState(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const unsafeLoginEnabled = process.env.NEXT_PUBLIC_ADMIN_UNSAFE_LOGIN_ENABLED === "true";

  async function getErrorMessage(response: Response): Promise<string> {
    const fallback = ru ? "Ошибка входа." : "Login failed.";
    const bodyText = await response.text().catch(() => "");
    if (!bodyText) return `${fallback} (HTTP ${response.status})`;

    try {
      const parsed = JSON.parse(bodyText) as { message?: string; error?: string };
      if (parsed?.message) return String(parsed.message);
      if (parsed?.error) return String(parsed.error);
    } catch {
      // Non-JSON body from upstream proxy.
    }

    const trimmed = bodyText.trim();
    if (!trimmed) return `${fallback} (HTTP ${response.status})`;
    return trimmed.slice(0, 200);
  }

  useEffect(() => {
    if (!botUsername) {
      setMessage(ru ? "Не задан NEXT_PUBLIC_TELEGRAM_BOT_USERNAME." : "Missing NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.");
      return;
    }

    window.onTelegramAdminAuth = async (user) => {
      setMessage(null);
      try {
        const response = await fetch("/api/admin/auth/telegram", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify(user)
        });
        if (!response.ok) {
          setMessage(await getErrorMessage(response));
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
  }, [botUsername, router, ru]);

  async function submitUnsafeLogin() {
    const normalized = devTelegramId.trim();
    if (!normalized || !/^\d+$/.test(normalized)) {
      setMessage(ru ? "Введите корректный telegram_id (число)." : "Enter a valid numeric telegram_id.");
      return;
    }

    setDevLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/auth/dev-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ telegramId: normalized })
      });
      if (!response.ok) {
        setMessage(await getErrorMessage(response));
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setDevLoading(false);
    }
  }

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ru ? "Вход в админку" : "Admin login"}</h1>
        <p>{ru ? "Войдите через Telegram, чтобы открыть панель управления." : "Sign in with Telegram to access admin panel."}</p>
        <div id="telegram-login-container" />
        {unsafeLoginEnabled ? (
          <div style={{ marginTop: 16, display: "grid", gap: 8, maxWidth: 420 }}>
            <p style={{ margin: 0 }}>
              {ru
                ? "Dev-вход: введите telegram_id пользователя (должен иметь роль organizer/admin)."
                : "Dev login: enter user telegram_id (must have organizer/admin role)."}
            </p>
            <input
              placeholder="telegram_id"
              value={devTelegramId}
              onChange={(e) => setDevTelegramId(e.target.value)}
            />
            <button type="button" onClick={submitUnsafeLogin} disabled={devLoading}>
              {devLoading ? (ru ? "Вход..." : "Signing in...") : (ru ? "Войти по telegram_id" : "Sign in by telegram_id")}
            </button>
          </div>
        ) : null}
        {message ? <p>{message}</p> : null}
      </section>
    </div>
  );
}
