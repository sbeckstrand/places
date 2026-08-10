export const LIGHT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
export const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

export function prefersDarkMap(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function mapStyleFor(dark: boolean): string {
  return dark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
}

// MapLibre's `compact: true` attribution control starts in its *expanded*
// state — but only once it actually has attribution text to show. At
// construction time there's no style loaded yet, so the control starts
// "empty"; it's the "styledata" event (fired once the style's attribution
// strings are available) that flips it to "maplibregl-compact
// maplibregl-compact-show" for the first time. Removing "-compact-show" on
// every "styledata" reproduces what a close-click does, timed to run after
// that — so it ends up collapsed on first load, and stays collapsed across
// later map.setStyle() calls (e.g. a theme switch) too, while the built-in
// click-to-expand toggle keeps working normally.
export function collapseMapAttribution(
  map: { on: (type: "styledata", listener: () => void) => unknown },
  container: HTMLElement,
) {
  map.on("styledata", () => {
    container
      .querySelector(".maplibregl-ctrl-attrib")
      ?.classList.remove("maplibregl-compact-show");
  });
}
