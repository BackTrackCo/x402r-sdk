import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/*/src/**/*.d.ts", "packages/*/src/**/index.ts", "**/*.test.ts"],
      thresholds: {
        // Per-package thresholds set in workspace configs
      },
    },
  },
});
