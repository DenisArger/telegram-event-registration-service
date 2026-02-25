import React from "react";
import twemoji from "twemoji";

interface EmojiTextProps {
  text: string;
  className?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function EmojiText({ text, className }: EmojiTextProps) {
  const safe = escapeHtml(text);
  const html = twemoji.parse(safe, {
    folder: "svg",
    ext: ".svg",
    base: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/",
    className: "emoji-fallback"
  });

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
