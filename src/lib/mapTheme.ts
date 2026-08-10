export const LIGHT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
export const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

// The site's light/dark mode is the "dark" class next-themes puts on <html>
// (see ThemeProvider / the /settings page) — not the raw OS media query, so
// the map follows the user's explicit choice rather than just their system.
export function isDarkTheme(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  );
}

export function mapStyleFor(dark: boolean): string {
  return dark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
}

// next-themes toggles the "dark" class directly on <html> (including when
// synced from another tab), which doesn't trigger a React re-render in
// components that aren't reading its context. Watch for that class flip
// directly so an already-mounted map's style stays in sync too.
export function watchThemeClass(onChange: (dark: boolean) => void) {
  const observer = new MutationObserver(() => onChange(isDarkTheme()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
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
