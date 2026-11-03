import { defineConfig } from "vitest/config";

// Real AI calls against the prompt fixtures: run only on demand with `npm run ai:eval`
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["scripts/ai-eval/**/*.eval.ts"],
    testTimeout: 1_800_000,
    alias: { "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname },
  },
});
