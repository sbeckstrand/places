import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ThemeSettings from "@/components/ThemeSettings";
import MapShareSettings from "@/components/MapShareSettings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const shares = await db.mapShare.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, sharedWithEmail: true },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <div className="flex flex-col gap-8">
        <ThemeSettings />
        <MapShareSettings initialShares={shares} />
      </div>
    </main>
  );
}
