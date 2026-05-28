import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@recipe-planner/db", "@recipe-planner/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
