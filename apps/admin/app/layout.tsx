import "./globals.css";
import React, { type ReactNode } from "react";
import { AdminHeader } from "./_components/admin-header";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <AdminHeader />
          <main className="page-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
