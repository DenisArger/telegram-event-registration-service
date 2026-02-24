import React from "react";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineMarkdown(line: string): string {
  return line
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
}

function toHtml(markdown: string): string {
  const escaped = escapeHtml(markdown);
  const lines = escaped.split(/\r?\n/);

  const html = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "<br/>";
    if (trimmed.startsWith("### ")) return `<h4>${applyInlineMarkdown(trimmed.slice(4))}</h4>`;
    if (trimmed.startsWith("## ")) return `<h3>${applyInlineMarkdown(trimmed.slice(3))}</h3>`;
    if (trimmed.startsWith("# ")) return `<h2>${applyInlineMarkdown(trimmed.slice(2))}</h2>`;
    if (trimmed.startsWith("- ")) return `<li>${applyInlineMarkdown(trimmed.slice(2))}</li>`;
    return `<p>${applyInlineMarkdown(trimmed)}</p>`;
  });

  return html.join("\n").replace(/(<li>.*?<\/li>(\n<li>.*?<\/li>)*)/gs, "<ul>$1</ul>");
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const safeHtml = toHtml(markdown);
  return <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
