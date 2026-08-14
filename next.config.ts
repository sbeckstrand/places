import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev-mode indicator badge.
  devIndicators: false,
  // Only relevant for `next dev` (harmless with `next start`, which doesn't
  // apply this guard at all) — kept so the production hostname still works
  // if this ever gets run in dev mode again, e.g. for debugging.
  allowedDevOrigins: ["places.beckstrand.dev"],
};

export default nextConfig;
