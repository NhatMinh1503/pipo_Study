import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/*.int.test.ts", "node_modules/**", ".next/**", ".next-e2e/**", "e2e/**", "supabase/**"],
    // `server-only` throws outside the React server bundler; stub it for unit tests
    alias: { "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname },
  },
});
