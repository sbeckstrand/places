import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSharedOwnerIds } from "@/lib/mapAccess";
import MapFilters from "@/components/MapFilters";
import CopyLinkButton from "@/components/CopyLinkButton";

export default async function MapPage() {
  const session = await auth();
  if (!session?.user) return null;

  const sharedOwnerIds = await getSharedOwnerIds(session.user.email);

  const entries = await db.entry.findMany({
    where: {
      authorId: { in: [session.user.id, ...sharedOwnerIds] },
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
    ownerName:
      e.authorId === session.user.id
        ? null
        : (e.author.name ?? e.author.email),
  }));

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-2 text-sm dark:border-neutral-800">
        <p className="text-neutral-500">
          Share a public map showing only your public entries.
        </p>
        <CopyLinkButton
          path={`/u/${session.user.id}/map`}
          label="Copy public map link"
        />
      </div>
      <MapFilters entries={mapEntries} />
    </main>
  );
}
