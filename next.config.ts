import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // E2E runs its own dev server next to `npm run dev`; a separate build dir avoids the dev lock
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // kuromoji loads its dictionary from node_modules at runtime; keep it out of the bundle
  serverExternalPackages: ["kuromoji"],
  // Self-contained server for the Docker image (S29); `next dev` ignores it
  output: "standalone",
  // The dictionary is read from a computed path at runtime, so file tracing cannot see it
  outputFileTracingIncludes: { "/**": ["./node_modules/kuromoji/dict/**"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
