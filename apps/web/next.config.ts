import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@brandpack/core", "@brandpack/adapters", "@brandpack/ui"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
