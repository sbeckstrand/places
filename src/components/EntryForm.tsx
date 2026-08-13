"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import LocationPicker from "@/components/LocationPicker";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";

type PlaceCandidate = {
  id: string;
  title: string;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  website: string | null;
  locationDescription: string | null;
  photoName: string | null;
};

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
  locationDescription: string;
  locationName: string;
  address: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [locationDescription, setLocationDescription] = useState(
    initial?.locationDescription ?? "",
  );
  const [locationName, setLocationName] = useState(
    initial?.locationName ?? "",
  );
  const [address, setAddress] = useState(initial?.address ?? "");
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

  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [suggestedPhotoName, setSuggestedPhotoName] = useState<string | null>(
    null,
  );

  async function handleImport() {
    if (!importQuery.trim()) return;
    setImporting(true);
    setImportError(null);
    setCandidates([]);
    try {
      const res = await fetch("/api/places-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: importQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      const results: PlaceCandidate[] = data.results ?? [];
      if (results.length === 0) {
        setImportError("No matching places found");
        return;
      }
      setCandidates(results);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setImporting(false);
    }
  }

  function applyCandidate(candidate: PlaceCandidate) {
    setTitle(candidate.title);
    setLocationName(candidate.locationName);
    if (candidate.address) setAddress(candidate.address);
    setLatitude(candidate.latitude);
    setLongitude(candidate.longitude);
    if (candidate.website) setWebsite(candidate.website);
    if (candidate.locationDescription) {
      setLocationDescription(candidate.locationDescription);
    }
    setSuggestedPhotoName(candidate.photoName);
    setCandidates([]);
  }

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
      let entryPhotos = photos
        .filter((p) => p.status === "done" && p.storageKey)
        .map((p) => ({
          storageKey: p.storageKey!,
          width: p.width,
          height: p.height,
        }));

      if (entryPhotos.length === 0 && suggestedPhotoName) {
        const res = await fetch("/api/uploads/from-google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoName: suggestedPhotoName }),
        });
        if (res.ok) {
          const data = await res.json();
          entryPhotos = [
            { storageKey: data.storageKey, width: data.width, height: data.height },
          ];
        }
        // If this fails, just save without a photo rather than blocking
        // the whole entry — the suggestion was a convenience, not required.
      }

      const payload = {
        title,
        description,
        locationDescription,
        locationName,
        address,
        latitude,
        longitude,
        website,
        visitedAt,
        rating,
        photos: entryPhotos,
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
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
        <label htmlFor="importQuery" className="text-sm font-medium">
          Search by name or address
        </label>
        <div className="flex gap-2">
          <input
            id="importQuery"
            type="text"
            value={importQuery}
            onChange={(e) => setImportQuery(e.target.value)}
            placeholder="e.g. Joe's Pizza, or 1435 Broadway, New York NY…"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importQuery.trim()}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            {importing ? "Searching…" : "Search"}
          </button>
        </div>
        {importError && <p className="text-sm text-red-600">{importError}</p>}
        {candidates.length > 0 && (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => applyCandidate(c)}
                className="flex items-center gap-3 border-b border-neutral-200 p-2 text-left last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                {c.photoName ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/places-photo?name=${encodeURIComponent(c.photoName)}&maxWidth=160`}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded object-cover"
                  />
                ) : (
                  <PhotoPlaceholder
                    className="h-12 w-12 shrink-0 rounded"
                    iconClassName="h-5 w-5"
                  />
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {c.title}
                  </span>
                  <span className="truncate text-xs text-neutral-500">
                    {c.address}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-500">
          Search, then pick the right result — fills in the title, address,
          website, and place description below (review before saving). A
          Google Maps place link (opened from a share link) also works
          instead of a name.
        </p>
      </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="locationName" className="text-sm font-medium">
            Location name
          </label>
          <input
            id="locationName"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Joe's Pizza"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="address" className="text-sm font-medium">
            Address
          </label>
          <input
            id="address"
            value={address}
            readOnly
            placeholder="Use search above to fill in an address"
            className="cursor-not-allowed rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
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
        <label htmlFor="locationDescription" className="text-sm font-medium">
          About this place
        </label>
        <textarea
          id="locationDescription"
          value={locationDescription}
          onChange={(e) => setLocationDescription(e.target.value)}
          rows={2}
          placeholder="What the establishment itself is — filled in by Import, or write your own"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Your review
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
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="self-start rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Upload photos
        </button>
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
        {photos.length === 0 && suggestedPhotoName && (
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/places-photo?name=${encodeURIComponent(suggestedPhotoName)}&maxWidth=200`}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSuggestedPhotoName(null)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                aria-label="Don't use this photo"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              From Google — used automatically since you haven&apos;t
              uploaded a photo of your own.
            </p>
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
