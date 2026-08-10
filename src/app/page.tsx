import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import EntryCard from "@/components/EntryCard";

export default async function Home() {
  const session = await auth();
  if (!session?.user) return null;

  const entries = await db.entry.findMany({
    where: { authorId: session.user.id },
    include: { photos: { orderBy: { createdAt: "asc" }, take: 1 } },
    orderBy: { visitedAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your entries</h1>
        <Link
          href="/entries/new"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
        >
          New Entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-neutral-500">
          No entries yet.{" "}
          <Link href="/entries/new" className="underline">
            Log your first meal
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}
