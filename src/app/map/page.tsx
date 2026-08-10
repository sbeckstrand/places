import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import MapView from "@/components/MapView";

export default async function MapPage() {
  const session = await auth();
  if (!session?.user) return null;

  const entries = await db.entry.findMany({
    where: {
      authorId: session.user.id,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      visitedAt: true,
      rating: true,
      photos: { orderBy: { createdAt: "asc" }, take: 1, select: { storageKey: true } },
    },
  });

  const mapEntries = entries.map((e) => ({
    id: e.id,
    title: e.title,
    latitude: e.latitude!,
    longitude: e.longitude!,
    visitedAt: e.visitedAt.toISOString(),
    rating: e.rating,
    thumbnailKey: e.photos[0]?.storageKey ?? null,
  }));

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {mapEntries.length === 0 && (
        <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800">
          No entries with a location yet — add coordinates when creating an
          entry to see it here.
        </p>
      )}
      <div className="relative min-h-0 flex-1">
        <MapView entries={mapEntries} />
      </div>
    </main>
  );
}
