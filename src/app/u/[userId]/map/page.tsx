import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSharedOwnerIds } from "@/lib/mapAccess";
import MapFilters from "@/components/MapFilters";

export default async function PublicUserMapPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) notFound();

  // People who've shared their map with this profile's owner also show up
  // here (public entries only, same as the profile owner's own) — keeps the
  // public link consistent with what the owner sees on their own /map.
  const sharedOwnerIds = await getSharedOwnerIds(user.email);

  const entries = await db.entry.findMany({
    where: {
      authorId: { in: [userId, ...sharedOwnerIds] },
      isPublic: true,
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
      authorId: true,
      author: { select: { name: true, email: true } },
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
    ownerId: e.authorId,
    ownerName: e.authorId === userId ? null : (e.author.name ?? e.author.email),
  }));

  const ownerLabel = user.name ?? user.email;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h1 className="text-lg font-semibold">
          {user.name ? `${user.name}'s Places` : "Public map"}
        </h1>
      </div>
      <MapFilters
        entries={mapEntries}
        emptyMessage="No public entries with a location yet."
        selfLabel={ownerLabel}
      />
    </main>
  );
}
