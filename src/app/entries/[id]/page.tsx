import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import MapView from "@/components/MapView";
import DeleteEntryButton from "@/components/DeleteEntryButton";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import PhotoGallery from "@/components/PhotoGallery";
import StarRating from "@/components/StarRating";
import { CATEGORY_LABELS } from "@/lib/categories";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const entry = await db.entry.findUnique({
    where: { id },
    include: { photos: { orderBy: { createdAt: "asc" } } },
  });

  if (!entry || entry.authorId !== session.user.id) {
    notFound();
  }

  const hasLocation = entry.latitude != null && entry.longitude != null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{entry.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {CATEGORY_LABELS[entry.category]}
            </span>
            <time>{new Date(entry.visitedAt).toLocaleDateString()}</time>
            {entry.locationName && <span>{entry.locationName}</span>}
            <StarRating rating={entry.rating} size={16} />
          </div>
          {entry.address && (
            <p className="mt-1 text-sm text-neutral-500">{entry.address}</p>
          )}
          {entry.locationDescription && (
            <p className="mt-1 text-sm italic text-neutral-500">
              {entry.locationDescription}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/entries/${entry.id}/edit`}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Edit
          </Link>
          <DeleteEntryButton entryId={entry.id} />
        </div>
      </div>

      {entry.photos.length > 0 ? (
        <PhotoGallery photos={entry.photos} alt={entry.title} />
      ) : (
        <PhotoPlaceholder className="mb-6 aspect-[4/3] w-full max-w-xs rounded-md" />
      )}

      {entry.website && (
        <p className="mb-4 text-sm">
          <a
            href={entry.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline dark:text-blue-400"
          >
            {entry.website}
          </a>
        </p>
      )}

      {entry.description && (
        <div className="mb-6">
          <h2 className="mb-1 text-sm font-medium text-neutral-500">
            Your review
          </h2>
          <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
            {entry.description}
          </p>
        </div>
      )}

      {hasLocation && (
        <div className="relative h-72 w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
          <MapView
            entries={[
              {
                id: entry.id,
                title: entry.title,
                latitude: entry.latitude!,
                longitude: entry.longitude!,
                visitedAt: entry.visitedAt.toISOString(),
                category: entry.category,
                rating: entry.rating,
                thumbnailKey: entry.photos[0]?.storageKey ?? null,
              },
            ]}
          />
        </div>
      )}
    </main>
  );
}
