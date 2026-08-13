"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EntryCard, { type EntryCardData } from "@/components/EntryCard";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";
import type { Category } from "@/generated/prisma/enums";

type BulkPayload =
  | { action: "delete" }
  | { action: "setCategory"; category: Category }
  | { action: "setPublic"; isPublic: boolean };

export default function EntryBulkGrid({
  entries,
}: {
  entries: EntryCardData[];
}) {
  const router = useRouter();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<Category>(
    CATEGORY_OPTIONS[0],
  );
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  async function runBulkAction(payload: BulkPayload) {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), ...payload }),
      });
      if (!res.ok) {
        alert("Bulk action failed.");
        return;
      }
      exitSelectionMode();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (selected.size === 0) return;
    const n = selected.size;
    if (
      !confirm(
        `Delete ${n} ${n === 1 ? "entry" : "entries"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    runBulkAction({ action: "delete" });
  }

  return (
    <div>
      <div className="mb-4">
        {selectionMode ? (
          <button
            type="button"
            onClick={exitSelectionMode}
            className="text-sm text-neutral-500 underline hover:text-neutral-900 dark:hover:text-white"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Select
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            selectable={selectionMode}
            selected={selected.has(entry.id)}
            onToggleSelect={() => toggle(entry.id)}
          />
        ))}
      </div>

      {selectionMode && selected.size > 0 && (
        <>
          {/* Keeps the fixed bar below from covering the last row of cards. */}
          <div className="h-20" />
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white px-4 py-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
              <span className="text-sm font-medium">
                {selected.size} selected
              </span>
              <button
                type="button"
                onClick={() => setSelected(new Set(entries.map((e) => e.id)))}
                className="text-sm text-neutral-500 underline hover:text-neutral-900 dark:hover:text-white"
              >
                Select all ({entries.length})
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <select
                  value={bulkCategory}
                  onChange={(e) =>
                    setBulkCategory(e.target.value as Category)
                  }
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runBulkAction({
                      action: "setCategory",
                      category: bulkCategory,
                    })
                  }
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Set category
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runBulkAction({ action: "setPublic", isPublic: true })
                  }
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Make public
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runBulkAction({ action: "setPublic", isPublic: false })
                  }
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Make private
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
