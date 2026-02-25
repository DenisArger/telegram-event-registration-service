import React, { type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "border-accent/20 bg-accent text-white hover:bg-accent/90",
  secondary: "border-border bg-surface text-text hover:bg-surface-elevated",
  ghost: "border-transparent bg-transparent text-text hover:bg-surface-elevated",
  danger: "border-danger/20 bg-danger text-white hover:bg-danger/90"
};

export function Button({ variant = "secondary", loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn("inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition", variantClass[variant], className)}
    >
      {loading ? <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-current/70" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
