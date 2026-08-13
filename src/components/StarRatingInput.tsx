"use client";

import { useState } from "react";
import { STAR_PATH, starFillPercents } from "@/lib/starRating";

export default function StarRatingInput({
  value,
  onChange,
  size = 32,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? value ?? 0;

  function commit(v: number) {
    onChange(value === v ? undefined : v);
  }

  return (
    <div
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
    >
      {starFillPercents(displayed).map((pct, i) => (
        <span
          key={i}
          className="relative inline-block shrink-0"
          style={{ width: size, height: size }}
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute inset-0 h-full w-full text-neutral-300 dark:text-neutral-700"
          >
            <path d={STAR_PATH} />
          </svg>
          <span
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ width: `${pct}%` }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="text-amber-400"
              style={{ width: size, height: size }}
            >
              <path d={STAR_PATH} />
            </svg>
          </span>
          <button
            type="button"
            aria-label={`${i + 0.5} star`}
            className="absolute inset-y-0 left-0 w-1/2"
            onMouseEnter={() => setHover(i + 0.5)}
            onClick={() => commit(i + 0.5)}
          />
          <button
            type="button"
            aria-label={`${i + 1} star`}
            className="absolute inset-y-0 right-0 w-1/2"
            onMouseEnter={() => setHover(i + 1)}
            onClick={() => commit(i + 1)}
          />
        </span>
      ))}
    </div>
  );
}
