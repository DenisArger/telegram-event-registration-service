import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx"
    ],
    coverage: {
      exclude: [
        "**/dist/**",
        "**/.next/**",
        "coverage/**",
        "api/**",
        "vitest.config.ts",
        "**/next-env.d.ts",
        "**/next.config.mjs",
        "packages/shared/src/contracts.ts"
      ]
    }
  }
});
