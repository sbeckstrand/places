"use client";

import { useMemo, useState } from "react";
import MapView, { type MapEntry } from "@/components/MapView";
import CategoryFilterDropdown from "@/components/CategoryFilterDropdown";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import type { Category } from "@/generated/prisma/enums";

export default function MapFilters({
  entries,
  emptyMessage = "No entries with a location yet — add coordinates when creating an entry to see it here.",
}: {
  entries: MapEntry[];
  emptyMessage?: string;
}) {
  const [categories, setCategories] = useState<Set<Category>>(
    () => new Set(CATEGORY_OPTIONS),
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!categories.has(e.category)) return false;
      const dateStr = e.visitedAt.slice(0, 10);
      if (fromDate && dateStr < fromDate) return false;
      if (toDate && dateStr > toDate) return false;
      return true;
    });
  }, [entries, categories, fromDate, toDate]);

  const filtersActive =
    categories.size !== CATEGORY_OPTIONS.length || fromDate !== "" || toDate !== "";

  function clearFilters() {
    setCategories(new Set(CATEGORY_OPTIONS));
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
