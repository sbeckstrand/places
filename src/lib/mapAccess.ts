import { db } from "@/lib/db";

// The ids of users who've added `viewerEmail` to their share list — i.e.
// everyone besides the viewer themselves whose entries should also show up
// on the viewer's map. Case-insensitive since email casing isn't guaranteed
// consistent across providers.
export async function getSharedOwnerIds(
  viewerEmail: string | null | undefined,
): Promise<string[]> {
  if (!viewerEmail) return [];
  const shares = await db.mapShare.findMany({
    where: { sharedWithEmail: viewerEmail.toLowerCase() },
    select: { ownerId: true },
  });
  return shares.map((s) => s.ownerId);
}
