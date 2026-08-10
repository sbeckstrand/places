import { auth } from "@/lib/auth";
import ThemeSettings from "@/components/ThemeSettings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <ThemeSettings />
    </main>
  );
}
