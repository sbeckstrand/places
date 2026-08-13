import Link from "next/link";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";

export type EntryCardData = {
  id: string;
  title: string;
  locationName: string | null;
  visitedAt: Date;
  rating: number | null;
  photos: { storageKey: string }[];
};

export default function EntryCard({ entry }: { entry: EntryCardData }) {
  const thumbnail = entry.photos[0];

  return (
    <Link
      href={`/entries/${entry.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 transition hover:shadow-md dark:border-neutral-800"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
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
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h3 className="truncate font-medium">{entry.title}</h3>
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span className="truncate">{entry.locationName ?? ""}</span>
          {entry.rating != null && <span>{"★".repeat(entry.rating)}</span>}
        </div>
        <time className="text-xs text-neutral-400">
          {new Date(entry.visitedAt).toLocaleDateString()}
        </time>
      </div>
    </Link>
  );
}
