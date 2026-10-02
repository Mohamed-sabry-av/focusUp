import "@focusUp/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // The React Compiler crashes Turbopack's loader on /dashboard in `next dev`
  // (Windows), so it is only enabled for production builds.
  reactCompiler: process.env.NODE_ENV === "production",
};

export default nextConfig;
