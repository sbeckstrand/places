// `visitedAt` is a calendar date the user picked (via <input type="date">),
// not a moment in time — so it must render identically no matter which
// timezone the server or the viewer's browser happens to be in. Using
// toLocaleDateString() (or any Intl API without a pinned timeZone) reads the
// runtime's local timezone, which differs between the Node server and the
// browser and previously caused a real hydration mismatch (the same UTC
// instant rendering as two different calendar dates). Formatting off the
// UTC getters keeps server and client output byte-identical.
export function formatVisitedDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month}/${day}/${year}`;
}
