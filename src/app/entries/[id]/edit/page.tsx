import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import EntryForm from "@/components/EntryForm";

export default async function EditEntryPage({
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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit entry</h1>
      <EntryForm
        mode="edit"
        entryId={entry.id}
        initial={{
          title: entry.title,
          description: entry.description ?? "",
          locationDescription: entry.locationDescription ?? "",
          locationName: entry.locationName ?? "",
          address: entry.address ?? "",
          latitude: entry.latitude,
          longitude: entry.longitude,
          website: entry.website ?? "",
          visitedAt: entry.visitedAt.toISOString().slice(0, 10),
          category: entry.category,
          rating: entry.rating,
          isPublic: entry.isPublic,
          photos: entry.photos.map((p) => ({ storageKey: p.storageKey })),
        }}
      />
    </main>
  );
}
