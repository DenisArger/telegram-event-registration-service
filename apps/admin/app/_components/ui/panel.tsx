import React, { type ReactNode } from "react";
import { cn } from "./cn";

interface PanelProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function Panel({ children, className, compact = false }: PanelProps) {
  return <section className={cn(compact ? "panel-compact" : "panel", className)}>{children}</section>;
}
