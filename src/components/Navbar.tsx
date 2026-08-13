import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function Navbar() {
  const session = await auth();
  if (!session?.user) {
    return (
      <nav className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <Link href="/" className="font-semibold">
          Places
        </Link>
        <Link
          href="/login"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          Sign in
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="flex items-center gap-5">
        <Link href="/" className="font-semibold">
          Places
        </Link>
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        >
          Feed
        </Link>
        <Link
          href="/map"
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        >
          Map
        </Link>
        <Link
          href="/entries/new"
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        >
          New Entry
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          Settings
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
