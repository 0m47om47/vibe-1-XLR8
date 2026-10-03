import type { NextConfig } from "next";

/** Where the backend API runs. The browser never talks to it directly. */
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev-only "N" badge defaults to bottom-left, where it covers the sidebar's Logout.
  devIndicators: { position: "bottom-right" },

  // Same-origin proxy: the browser calls /api/* on this app and Next forwards it
  // to the backend. The session cookie therefore stays first-party (no CORS,
  // no third-party cookie problems).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },

  // Route names from the project brief → the pages that implement them.
  async redirects() {
    return [
      { source: "/requests/new", destination: "/request", permanent: false },
      { source: "/requests/:id", destination: "/rides/:id", permanent: false },
      { source: "/history", destination: "/my-trips", permanent: false },
      { source: "/rider/dashboard", destination: "/rider", permanent: false },
      { source: "/rider/trips/:id", destination: "/rider/active/:id", permanent: false },
    ];
  },
};

export default nextConfig;
