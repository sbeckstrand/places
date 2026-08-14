"use client";

import { useMemo, useState } from "react";
import MapView, { type MapEntry } from "@/components/MapView";
import CategoryFilterDropdown from "@/components/CategoryFilterDropdown";
import UserFilterDropdown from "@/components/UserFilterDropdown";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import type { Category } from "@/generated/prisma/enums";

export default function MapFilters({
  entries,
  emptyMessage = "No entries with a location yet — add coordinates when creating an entry to see it here.",
  // `ownerName` is null for whoever this map page is "about" — the logged-in
  // viewer on /map, or the profile owner on /u/<id>/map (where the viewer
  // could be anyone, so "You" would be wrong there). Callers pass the right
  // label for that person; entries shared in from others already carry their
  // own real ownerName.
  selfLabel = "You",
}: {
  entries: MapEntry[];
  emptyMessage?: string;
  selfLabel?: string;
}) {
  const [categories, setCategories] = useState<Set<Category>>(
    () => new Set(CATEGORY_OPTIONS),
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Distinct owners present in `entries` — only meaningful once map sharing
  // has mixed someone else's entries into your own, so the dropdown itself
  // stays hidden below when there's only one. `entries` is a fixed prop from
  // the server, not something that changes after mount, so deriving initial
  // state from it here is safe.
  const userOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      if (!seen.has(e.ownerId)) seen.set(e.ownerId, e.ownerName ?? selfLabel);
    }
    return Array.from(seen, ([id, label]) => ({ id, label })).sort((a, b) => {
      if (a.label === selfLabel) return -1;
      if (b.label === selfLabel) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [entries, selfLabel]);

  const [userIds, setUserIds] = useState<Set<string>>(
    () => new Set(userOptions.map((o) => o.id)),
  );

  function toggleCategory(category: Category) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function toggleUser(id: string) {
    setUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!categories.has(e.category)) return false;
      if (!userIds.has(e.ownerId)) return false;
      const dateStr = e.visitedAt.slice(0, 10);
      if (fromDate && dateStr < fromDate) return false;
      if (toDate && dateStr > toDate) return false;
      return true;
    });
  }, [entries, categories, userIds, fromDate, toDate]);

  const filtersActive =
    categories.size !== CATEGORY_OPTIONS.length ||
    userIds.size !== userOptions.length ||
    fromDate !== "" ||
    toDate !== "";

  function clearFilters() {
    setCategories(new Set(CATEGORY_OPTIONS));
    setUserIds(new Set(userOptions.map((o) => o.id)));
    setFromDate("");
    setToDate("");
  }

  if (entries.length === 0) {
    return (
      <>
        <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800">
          {emptyMessage}
        </p>
        <div className="relative min-h-0 flex-1">
          <MapView entries={entries} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
        <CategoryFilterDropdown selected={categories} onToggle={toggleCategory} />

        {userOptions.length > 1 && (
          <UserFilterDropdown
            options={userOptions}
            selected={userIds}
            onToggle={toggleUser}
          />
        )}

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="flex items-center gap-1.5">
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        <span className="text-neutral-500">
          {filtered.length} of {entries.length}
        </span>

        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-neutral-500 underline hover:text-neutral-900 dark:hover:text-white"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800">
          No entries match these filters.
        </p>
      )}

      <div className="relative min-h-0 flex-1">
        <MapView entries={filtered} />
      </div>
    </>
  );
}
