import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API-only app: never advertise the framework.
  poweredByHeader: false,
  // The MongoDB driver must stay a Node.js runtime dependency, not be bundled.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
