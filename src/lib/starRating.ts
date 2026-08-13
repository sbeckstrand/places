// Heroicons "star" (solid), 20x20 viewBox — shared by every star-rating
// renderer (React display, React input, and MapView's raw-DOM popup) so the
// glyph stays identical everywhere.
export const STAR_PATH =
  "M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.454 1.405 1.02L10 15.591l4.069 2.485c.713.434 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z";

export const MAX_STARS = 5;

// One fill percentage (0, 50, or 100) per star, for a rating in 0.5 steps.
export function starFillPercents(
  rating: number | null | undefined,
  max = MAX_STARS,
): number[] {
  const value = rating ?? 0;
  return Array.from({ length: max }, (_, i) => {
    const diff = value - i;
    if (diff >= 1) return 100;
    if (diff <= 0) return 0;
    return Math.round(diff * 100);
  });
}
