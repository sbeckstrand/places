"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";
import type { Category } from "@/generated/prisma/enums";

export default function CategoryFilterDropdown({
  selected,
  onToggle,
}: {
  selected: Set<Category>;
  onToggle: (category: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label =
    selected.size === CATEGORY_OPTIONS.length
      ? "All categories"
      : selected.size === 0
        ? "No categories"
        : `${selected.size} categor${selected.size === 1 ? "y" : "ies"}`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700"
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-neutral-500"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 flex w-44 flex-col gap-0.5 rounded-md border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {CATEGORY_OPTIONS.map((c) => (
            <label
              key={c}
              className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <input
                type="checkbox"
                checked={selected.has(c)}
                onChange={() => onToggle(c)}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              {CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
