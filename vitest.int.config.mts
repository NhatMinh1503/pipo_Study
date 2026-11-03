import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Integration tests talk to the local Supabase stack, so they load .env.local
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["test/integration/**/*.int.test.ts"],
    env: loadEnv("development", process.cwd(), ""),
    fileParallelism: false,
    // `server-only` throws outside the React server bundler; services are tested directly
    alias: { "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname },
  },
});
