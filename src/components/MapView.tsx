"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Map as MapLibreMap,
  LngLatBounds,
  NavigationControl,
  Popup,
  type DataDrivenPropertyValueSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import {
  collapseMapAttribution,
  isDarkTheme,
  mapStyleFor,
  watchThemeClass,
} from "@/lib/mapTheme";
import { STAR_PATH, starFillPercents } from "@/lib/starRating";
import { CATEGORY_MAP_COLORS } from "@/lib/categories";
import { formatVisitedDate } from "@/lib/formatDate";
import type { Category } from "@/generated/prisma/enums";

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];

// Same glyph as PhotoPlaceholder — this popup is built with raw DOM calls
// (it's MapLibre popup content, not React), so it's inlined as markup here
// rather than shared as a component.
const PHOTO_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>`;

// Same star glyph/fill math as StarRating — this popup is built with raw DOM
// calls (it's MapLibre popup content, not React), so it's assembled as
// markup here rather than shared as a component.
function starsMarkup(rating: number, sizePx = 12): string {
  return starFillPercents(rating)
    .map(
      (pct) =>
        `<span class="relative inline-block shrink-0" style="width:${sizePx}px;height:${sizePx}px">` +
        `<svg viewBox="0 0 20 20" fill="currentColor" class="absolute inset-0 h-full w-full text-neutral-300 dark:text-neutral-700"><path d="${STAR_PATH}"/></svg>` +
        `<span class="absolute inset-0 overflow-hidden" style="width:${pct}%">` +
        `<svg viewBox="0 0 20 20" fill="currentColor" class="text-amber-400" style="width:${sizePx}px;height:${sizePx}px"><path d="${STAR_PATH}"/></svg>` +
        `</span></span>`,
    )
    .join("");
}

// Above this many entries in a cluster, zoom in to split it apart instead of
// listing every entry in the picker popup.
const MAX_PICKER_ENTRIES = 8;

export type MapEntry = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  visitedAt: string;
  category: Category;
  rating: number | null;
  thumbnailKey: string | null;
};

function entriesToGeoJSON(
  entries: MapEntry[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: entries.map((e) => ({
      type: "Feature",
      properties: {
        id: e.id,
        title: e.title,
        visitedAt: e.visitedAt,
        category: e.category,
        rating: e.rating,
        thumbnailKey: e.thumbnailKey,
      },
      geometry: { type: "Point", coordinates: [e.longitude, e.latitude] },
    })),
  };
}

export default function MapView({ entries }: { entries: MapEntry[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  const mapRef = useRef<MapLibreMap | null>(null);
  // Kept current on every render so the mount-once effect below (and its
  // "style.load" handler, which re-fires on theme-driven style swaps) can
  // always read the latest filtered entries without re-running.
  const entriesRef = useRef(entries);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Pushes filtered data into the already-created map instead of tearing
  // down and rebuilding it, so toggling map filters doesn't reset the
  // camera position/zoom. Skips the render that the mount effect below
  // already consumed as its initial data.
  const skipNextUpdate = useRef(true);
  useEffect(() => {
    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }
    const source = mapRef.current?.getSource("entries") as
      | GeoJSONSource
      | undefined;
    source?.setData(entriesToGeoJSON(entries));
  }, [entries]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const initialEntries = entriesRef.current;

    let bounds: LngLatBounds | null = null;
    if (initialEntries.length > 0) {
      bounds = initialEntries.reduce(
        (b, e) => b.extend([e.longitude, e.latitude]),
        new LngLatBounds(
          [initialEntries[0].longitude, initialEntries[0].latitude],
          [initialEntries[0].longitude, initialEntries[0].latitude],
        ),
      );
    }

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: mapStyleFor(isDarkTheme()),
      center: bounds ? bounds.getCenter() : DEFAULT_CENTER,
      zoom: bounds ? 11 : 3,
      // Collapses the required OSM/OpenFreeMap attribution to a small "i"
      // icon by default instead of always showing the full text — it's
      // still there and expands on click, just not taking up space.
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");
    collapseMapAttribution(map, mapContainer.current);

    let currentPopup: Popup | null = null;

    function showEntryPicker(
      lngLat: [number, number],
      items: Pick<
        MapEntry,
        "id" | "title" | "visitedAt" | "rating" | "thumbnailKey"
      >[],
    ) {
      currentPopup?.remove();

      const list = document.createElement("div");
      list.className =
        "flex max-h-72 w-64 flex-col gap-0.5 overflow-y-auto p-1";

      for (const item of items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800";
        btn.onclick = () => {
          currentPopup?.remove();
          routerRef.current.push(`/entries/${item.id}`);
        };

        const thumb = document.createElement(item.thumbnailKey ? "img" : "div");
        if (item.thumbnailKey && thumb instanceof HTMLImageElement) {
          thumb.className = "h-10 w-10 shrink-0 rounded object-cover";
          thumb.src = `/api/images/${item.thumbnailKey}`;
        } else {
          thumb.className =
            "flex h-10 w-10 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-300 dark:bg-neutral-900 dark:text-neutral-700";
          thumb.innerHTML = PHOTO_PLACEHOLDER_SVG;
        }
        btn.appendChild(thumb);

        const textWrap = document.createElement("div");
        textWrap.className = "flex min-w-0 flex-col";

        const titleEl = document.createElement("span");
        titleEl.className =
          "truncate text-sm font-medium text-neutral-900 dark:text-neutral-100";
        titleEl.textContent = item.title;
        textWrap.appendChild(titleEl);

        const metaEl = document.createElement("span");
        metaEl.className = "flex items-center gap-1 text-xs text-neutral-500";
        const dateEl = document.createElement("span");
        dateEl.textContent = formatVisitedDate(item.visitedAt);
        metaEl.appendChild(dateEl);
        if (item.rating != null) {
          const starsEl = document.createElement("span");
          starsEl.className = "inline-flex items-center gap-0.5";
          starsEl.innerHTML = starsMarkup(item.rating, 12);
          metaEl.appendChild(starsEl);
        }
        textWrap.appendChild(metaEl);

        btn.appendChild(textWrap);
        list.appendChild(btn);
      }

      currentPopup = new Popup({ closeButton: true, maxWidth: "280px" })
        .setLngLat(lngLat)
        .setDOMContent(list)
        .addTo(map);
    }

    // Runs after every style load — including the initial one and any later
    // map.setStyle() call (e.g. from a theme switch), since setStyle wipes
    // all custom sources/layers and "style.load" fires again once the new
    // style is ready.
    let hasFitBounds = false;
    function setupLayers() {
      if (!hasFitBounds && bounds && initialEntries.length > 1) {
        // animate:false makes this an instant jump rather than an eased
        // transition — appropriate for the initial fit, and avoids relying
        // on a requestAnimationFrame-driven animation actually progressing
        // before the user looks at the map.
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, animate: false });
        hasFitBounds = true;
      }

      // Reads the ref (not the initial closure) so a style reload — e.g.
      // from a theme switch — rebuilds the source with whatever's currently
      // filtered in, not what was passed in on mount.
      map.addSource("entries", {
        type: "geojson",
        data: entriesToGeoJSON(entriesRef.current),
        cluster: true,
        // Lower than MapLibre's defaults (14 / 50px) so pins only merge once
        // they're genuinely close together on screen, and stop clustering
        // entirely well before street-level zoom.
        clusterMaxZoom: 14,
        clusterRadius: 20,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "entries",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#60a5fa",
            10,
            "#3b82f6",
            50,
            "#1d4ed8",
          ],
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "entries",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "entries",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "category"],
            ...Object.entries(CATEGORY_MAP_COLORS).flat(),
            CATEGORY_MAP_COLORS.OTHER,
          ] as unknown as DataDrivenPropertyValueSpecification<string>,
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    map.on("style.load", setupLayers);

    // Registered once (not inside setupLayers) so a theme-driven style swap
    // doesn't stack up duplicate listeners — these query rendered features
    // by layer id at click-time, so they keep working across style reloads.
    map.on("click", "clusters", async (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });
      const feature = features[0];
      if (!feature) return;

      const clusterId = feature.properties?.cluster_id;
      const pointCount = feature.properties?.point_count as number;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      const source = map.getSource("entries") as GeoJSONSource;

      if (pointCount <= MAX_PICKER_ENTRIES) {
        const leaves = await source.getClusterLeaves(clusterId, pointCount, 0);
        showEntryPicker(
          coordinates,
          leaves.map((f) => f.properties as MapEntry),
        );
        return;
      }

      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({ center: coordinates, zoom });
    });

    map.on("click", "unclustered-point", (e: MapLayerMouseEvent) => {
      const clicked = map.queryRenderedFeatures(e.point, {
        layers: ["unclustered-point"],
      });
      if (clicked.length === 0) return;

      const seen = new Set<string>();
      const items: MapGeoJSONFeature["properties"][] = [];
      for (const f of clicked) {
        const id = f.properties?.id as string | undefined;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(f.properties);
      }

      if (items.length === 1) {
        routerRef.current.push(`/entries/${items[0]!.id}`);
        return;
      }

      showEntryPicker(e.lngLat.toArray() as [number, number], items as MapEntry[]);
    });

    for (const layer of ["clusters", "unclustered-point"]) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    const stopWatchingTheme = watchThemeClass((dark) => {
      map.setStyle(mapStyleFor(dark));
    });

    return () => {
      stopWatchingTheme();
      map.remove();
      mapRef.current = null;
    };
    // Mount-once: creates the map using whichever `entries` were passed on
    // first render (see entriesRef/skipNextUpdate above for how later prop
    // changes — e.g. toggling a map filter — get applied without rebuilding
    // the map and losing the camera position).
  }, []);

  // The ref'd div becomes `.maplibregl-map` (maplibre-gl adds that class
  // itself), and maplibre-gl's own unlayered CSS beats Tailwind v4's
  // layered utilities in the cascade — so sizing classes placed directly on
  // it (h-full, absolute, ...) get silently overridden. Keep it inside a
  // plain wrapper we fully control instead: the wrapper is positioned
  // against the caller's `relative` ancestor (which must also have a real
  // height), and the ref'd div then sizes itself off that wrapper's
  // definite abspos box rather than the caller's possibly-ambiguous one.
  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
