import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/types/index.ts",
    "src/abis/index.ts",
    "src/config/index.ts",
    "src/errors/index.ts",
    "src/factory/index.ts",
    "src/conditions/index.ts",
    "src/fees/index.ts",
  ],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
