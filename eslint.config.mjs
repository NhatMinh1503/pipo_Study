import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
    },
  },
  {
    // CLI scripts report progress on the terminal
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  {
    // shadcn primitives are generated code; keep them as upstream ships them
    files: ["components/ui/**"],
    rules: { "@typescript-eslint/consistent-type-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "types/database.ts",
  ]),
]);

export default eslintConfig;
