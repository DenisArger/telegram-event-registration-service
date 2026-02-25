"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const ru = process.env.NEXT_PUBLIC_LOCALE === "ru";
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const getErrorMessage = useCallback(async (response: Response): Promise<string> => {
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
  }, [ru]);

  async function submitEmail() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage(ru ? "Введите корректный email." : "Enter a valid email.");
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/auth/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail })
      });
      if (!response.ok) {
        setMessage(await getErrorMessage(response));
        return;
      }
      setOtpStep(true);
      setMessage(ru ? "Код отправлен на email." : "OTP code has been sent to your email.");
    } catch {
      setMessage(ru ? "Сетевая ошибка." : "Network error.");
    } finally {
      setSending(false);
    }
  }

  async function submitOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = otpToken.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@") || !normalizedToken) {
      setMessage(ru ? "Введите email и код из письма." : "Enter your email and OTP code.");
      return;
    }

    setVerifying(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, token: normalizedToken })
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
      setVerifying(false);
    }
  }

  return (
    <div className="section-grid">
      <section className="card">
        <h1>{ru ? "Вход в админку" : "Admin login"}</h1>
        <p>{ru ? "Войдите по email-коду, чтобы открыть панель управления." : "Sign in with email OTP to access admin panel."}</p>
        <div style={{ marginTop: 16, display: "grid", gap: 8, maxWidth: 420 }}>
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending || verifying}
          />
          {!otpStep ? (
            <button type="button" onClick={submitEmail} disabled={sending}>
              {sending
                ? (ru ? "Отправка..." : "Sending...")
                : (ru ? "Получить код" : "Send OTP code")}
            </button>
          ) : (
            <>
              <input
                inputMode="numeric"
                placeholder={ru ? "Код из письма" : "OTP code"}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                disabled={verifying}
              />
              <button type="button" onClick={submitOtp} disabled={verifying}>
                {verifying
                  ? (ru ? "Проверка..." : "Verifying...")
                  : (ru ? "Войти" : "Sign in")}
              </button>
              <button type="button" onClick={submitEmail} disabled={sending || verifying}>
                {ru ? "Отправить код заново" : "Resend code"}
              </button>
            </>
          )}
        </div>
        {message ? <p>{message}</p> : null}
      </section>
    </div>
  );
}
