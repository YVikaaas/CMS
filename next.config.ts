import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When a parent folder has its own lockfile, pin Turbopack to this app root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
