import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Manually specify the monorepo root to silence multiple lockfiles warnings
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;

