import Link from "next/link";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import StarRating from "@/components/StarRating";
import { Category } from "@/generated/prisma/enums";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatVisitedDate } from "@/lib/formatDate";

export type EntryCardData = {
  id: string;
  title: string;
  locationName: string | null;
  visitedAt: Date;
  category: Category;
  rating: number | null;
  isPublic: boolean;
  photos: { storageKey: string }[];
};

export default function EntryCard({
  entry,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  entry: EntryCardData;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const thumbnail = entry.photos[0];

  const cardClassName = `group relative flex flex-col overflow-hidden rounded-lg border transition ${
    selected
      ? "border-blue-500 ring-2 ring-blue-500"
      : "border-neutral-200 hover:shadow-md dark:border-neutral-800"
  }`;

  const content = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/images/${thumbnail.storageKey}`}
            alt={entry.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <PhotoPlaceholder className="h-full w-full" />
        )}
        <span
          className={`absolute top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm ${selectable ? "left-9" : "left-2"}`}
        >
          {CATEGORY_LABELS[entry.category]}
        </span>
        {entry.isPublic && (
          <span className="absolute right-2 top-2 rounded-full bg-blue-600/90 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            Public
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h3 className="truncate font-medium">{entry.title}</h3>
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span className="truncate">{entry.locationName ?? ""}</span>
          <StarRating rating={entry.rating} size={14} />
        </div>
        <time className="text-xs text-neutral-400">
          {formatVisitedDate(entry.visitedAt)}
        </time>
      </div>
    </>
  );

  if (selectable) {
    return (
      <div
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
        onClick={onToggleSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleSelect?.();
          }
        }}
        className={`${cardClassName} cursor-pointer`}
      >
        <span
          className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow dark:border-neutral-950 ${
            selected
              ? "bg-blue-600 text-white"
              : "bg-white text-transparent dark:bg-neutral-800"
          }`}
        >
          ✓
        </span>
        {content}
      </div>
    );
  }

  return (
    <Link href={`/entries/${entry.id}`} className={cardClassName}>
      {content}
    </Link>
  );
}
