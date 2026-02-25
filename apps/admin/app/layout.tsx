import "./globals.css";
import React, { type ReactNode } from "react";
import { AdminHeader } from "./_components/admin-header";

const themeScript = `(() => {
  try {
    const stored = localStorage.getItem('admin_theme');
    const fallback = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored === 'dark' || stored === 'light' ? stored : fallback;
    document.documentElement.dataset.theme = theme;
  } catch {}
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="page-shell">
          <AdminHeader />
          <main className="page-content">
            <div className="page-stack">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
