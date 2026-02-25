import React from "react";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <p className="rounded-xl border border-dashed border-border bg-surface-elevated p-4 text-sm text-muted">{message}</p>;
}
