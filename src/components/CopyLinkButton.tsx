"use client";

import { useState } from "react";

export default function CopyLinkButton({
  path,
  label = "Copy link",
  className = "px-3 py-1.5",
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-md border border-neutral-300 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900 ${className}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
