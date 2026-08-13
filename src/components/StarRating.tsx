import { STAR_PATH, starFillPercents } from "@/lib/starRating";

export default function StarRating({
  rating,
  size = 16,
  className = "",
}: {
  rating: number | null | undefined;
  size?: number;
  className?: string;
}) {
  if (rating == null) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {starFillPercents(rating).map((pct, i) => (
        <span
          key={i}
          className="relative inline-block shrink-0"
          style={{ width: size, height: size }}
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="absolute inset-0 h-full w-full text-neutral-300 dark:text-neutral-700"
          >
            <path d={STAR_PATH} />
          </svg>
          <span
            className="absolute inset-0 overflow-hidden"
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
        </span>
      ))}
    </span>
  );
}
