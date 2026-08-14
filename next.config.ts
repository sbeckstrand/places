import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev-mode indicator badge.
  devIndicators: false,
  // The production deployment still runs `next dev` (see README's CI
  // section), so this dev-only guard — which blocks the browser from
  // loading JS chunks/HMR when the request's Host doesn't match localhost —
  // otherwise fires for every real visitor and silently breaks all
  // client-side interactivity (map, entry form search, etc.) while the
  // static HTML shell still renders fine.
  allowedDevOrigins: ["places.beckstrand.dev"],
};

export default nextConfig;
