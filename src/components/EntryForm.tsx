"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LocationPicker from "@/components/LocationPicker";

type PhotoItem = {
  key: string; // local React key, stable across the item's lifetime
  storageKey?: string;
  width?: number;
  height?: number;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  error?: string;
};

export type EntryFormInitial = {
  title: string;
  description: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  website: string;
  visitedAt: string; // yyyy-mm-dd
  rating: number | null;
  photos: { storageKey: string }[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function EntryForm({
  mode,
  entryId,
  initial,
}: {
  mode: "create" | "edit";
  entryId?: string;
  initial?: EntryFormInitial;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [locationName, setLocationName] = useState(
    initial?.locationName ?? "",
  );
  const [latitude, setLatitude] = useState<number | undefined>(
    initial?.latitude ?? undefined,
  );
  const [longitude, setLongitude] = useState<number | undefined>(
    initial?.longitude ?? undefined,
  );
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [visitedAt, setVisitedAt] = useState(initial?.visitedAt ?? todayIso());
  const [rating, setRating] = useState<number | undefined>(
    initial?.rating ?? undefined,
  );
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (initial?.photos ?? []).map((p) => ({
      key: p.storageKey,
      storageKey: p.storageKey,
      previewUrl: `/api/images/${p.storageKey}`,
      status: "done",
    })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);

    const items: PhotoItem[] = files.map((file) => ({
      key: `${file.name}-${file.lastModified}-${Math.random()}`,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }));
    setPhotos((prev) => [...prev, ...items]);

    await Promise.all(
      files.map(async (file, i) => {
        const item = items[i];
        try {
          const body = new FormData();
          body.append("file", file);
          const res = await fetch("/api/uploads", { method: "POST", body });
          if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
          const data = await res.json();

          setPhotos((prev) =>
            prev.map((p) =>
              p.key === item.key
                ? {
                    ...p,
                    status: "done",
                    storageKey: data.storageKey,
                    width: data.width,
                    height: data.height,
                  }
                : p,
            ),
          );

          if (data.gps && latitude == null && longitude == null) {
            setLatitude(data.gps.latitude);
            setLongitude(data.gps.longitude);
          }
        } catch (err) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.key === item.key
                ? {
                    ...p,
                    status: "error",
                    error: err instanceof Error ? err.message : "Upload failed",
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  function removePhoto(key: string) {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (photos.some((p) => p.status === "uploading")) {
      setFormError("Wait for photo uploads to finish before saving.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        locationName,
        latitude,
        longitude,
        website,
        visitedAt,
        rating,
        photos: photos
          .filter((p) => p.status === "done" && p.storageKey)
          .map((p) => ({
            storageKey: p.storageKey!,
            width: p.width,
            height: p.height,
          })),
      };

      const res = await fetch(
        mode === "create" ? "/api/entries" : `/api/entries/${entryId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to save entry",
        );
      }

      const data = await res.json();
      router.push(`/entries/${data.entry.id}`);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save entry");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="visitedAt" className="text-sm font-medium">
            Date
          </label>
          <input
            id="visitedAt"
            type="date"
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
            required
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Rating</label>
          <div className="flex items-center gap-1 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? undefined : n)}
                className="text-xl leading-none"
                aria-label={`${n} star`}
              >
                {rating != null && n <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="locationName" className="text-sm font-medium">
          Location name
        </label>
        <input
          id="locationName"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="e.g. Joe's Pizza, New York, NY"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <LocationPicker
        latitude={latitude}
        longitude={longitude}
        onChange={(lat, lng) => {
          setLatitude(lat);
          setLongitude(lng);
        }}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="website" className="text-sm font-medium">
          Website
        </label>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://..."
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Photos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.key}
                className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {p.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                    Uploading…
                  </div>
                )}
                {p.status === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 p-1 text-center text-xs text-white">
                    {p.error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(p.key)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {submitting ? "Saving…" : mode === "create" ? "Create entry" : "Save changes"}
      </button>
    </form>
  );
}
