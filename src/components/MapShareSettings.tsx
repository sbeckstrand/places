"use client";

import { useState } from "react";

type Share = {
  id: string;
  sharedWithEmail: string;
};

export default function MapShareSettings({
  initialShares,
}: {
  initialShares: Share[];
}) {
  const [shares, setShares] = useState(initialShares);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setShares((prev) => [...prev, data.share]);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    setShares((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/settings/shares/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Share your map</span>
      <p className="text-xs text-neutral-500">
        People on this list can see all of your entries — public and
        private — on their own map. Access starts as soon as they sign in
        with a matching Google account, even if that&apos;s not until later.
      </p>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="someone@gmail.com"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {shares.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {shares.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>{s.sharedWithEmail}</span>
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="text-neutral-500 underline hover:text-neutral-900 dark:hover:text-white"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
