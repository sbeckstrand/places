import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import MapFilters from "@/components/MapFilters";

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
      category: true,
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
    category: e.category,
    rating: e.rating,
    thumbnailKey: e.photos[0]?.storageKey ?? null,
  }));

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <MapFilters entries={mapEntries} />
    </main>
  );
}
