import React, { type ReactNode } from "react";
import { cn } from "./cn";

interface BadgeProps {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "muted";
  className?: string;
}

const toneClass = {
  default: "border-accent/30 bg-accent/10 text-text",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-border bg-surface-elevated text-muted"
};

export function Badge({ children, tone = "default", className }: BadgeProps) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", toneClass[tone], className)}>{children}</span>;
}
