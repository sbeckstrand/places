"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type MapMouseEvent,
} from "maplibre-gl";
import {
  collapseMapAttribution,
  isDarkTheme,
  mapStyleFor,
  watchThemeClass,
} from "@/lib/mapTheme";

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];

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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const hasPin = latitude != null && longitude != null;
    const map = new MapLibreMap({
      container: mapContainer.current,
      style: mapStyleFor(isDarkTheme()),
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

    const stopWatchingTheme = watchThemeClass((dark) => {
      map.setStyle(mapStyleFor(dark));
    });

    return () => {
      stopWatchingTheme();
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

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={mapContainer}
        className="h-64 w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
      />
      <p className="text-xs text-neutral-500">Click the map to drop a pin.</p>
    </div>
  );
}
