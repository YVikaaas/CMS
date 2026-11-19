import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When a parent folder has its own lockfile, pin Turbopack to this app root.
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      { source: "/championships", destination: "/events", permanent: false },
      { source: "/championships/:path*", destination: "/events/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
