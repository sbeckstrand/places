import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev-mode indicator badge.
  devIndicators: false,
  // Only relevant for `next dev` (harmless with `next start`, which doesn't
  // apply this guard at all) — kept so the production hostname still works
  // if this ever gets run in dev mode again, e.g. for debugging.
  allowedDevOrigins: ["places.beckstrand.dev"],
  experimental: {
    // Every route (including /api/uploads) goes through src/proxy.ts, and
    // Next buffers the request body up to this limit before handing off to
    // the route handler — default is 10mb, well under MAX_FILE_BYTES in
    // /api/uploads. Keep the two in sync.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
