"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type MapMouseEvent,
} from "maplibre-gl";
import { collapseMapAttribution, mapStyleFor } from "@/lib/mapTheme";

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];

type GeocodeResult = { displayName: string; latitude: number; longitude: number };

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const hasPin = latitude != null && longitude != null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const map = new MapLibreMap({
      container: mapContainer.current,
      style: mapStyleFor(prefersDark.matches),
      center: hasPin ? [longitude!, latitude!] : DEFAULT_CENTER,
      zoom: hasPin ? 13 : 3,
      // Collapses the required OSM/OpenFreeMap attribution to a small "i"
      // icon by default instead of always showing the full text — it's
      // still there and expands on click, just not taking up space.
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl(), "top-right");
    collapseMapAttribution(map, mapContainer.current);
    map.on("click", (e: MapMouseEvent) =>
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng),
    );
    mapRef.current = map;

    function handleThemeChange(e: MediaQueryListEvent) {
      map.setStyle(mapStyleFor(e.matches));
    }
    prefersDark.addEventListener("change", handleThemeChange);

    return () => {
      prefersDark.removeEventListener("change", handleThemeChange);
      map.remove();
      mapRef.current = null;
    };
    // Map is only initialized once; lat/lng updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new Marker({ color: "#ef4444" })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    map.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(map.getZoom(), 13),
    });
  }, [latitude, longitude]);

  async function search() {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Search for an address or place..."
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                onClick={() => {
                  onChangeRef.current(r.latitude, r.longitude);
                  setResults([]);
                  setQuery(r.displayName);
                }}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={mapContainer}
        className="h-64 w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
      />
      <p className="text-xs text-neutral-500">
        Click the map to drop a pin, or search above.
      </p>
    </div>
  );
}
