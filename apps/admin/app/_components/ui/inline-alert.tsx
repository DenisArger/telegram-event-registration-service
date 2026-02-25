import React from "react";
import { cn } from "./cn";

interface InlineAlertProps {
  message: string;
  tone?: "info" | "success" | "error";
}

const toneClass = {
  info: "border-border bg-surface-elevated text-muted",
  success: "border-success/40 bg-success/10 text-success",
  error: "border-danger/40 bg-danger/10 text-danger"
};

export function InlineAlert({ message, tone = "info" }: InlineAlertProps) {
  return <p className={cn("rounded-lg border px-3 py-2 text-sm", toneClass[tone])}>{message}</p>;
}
