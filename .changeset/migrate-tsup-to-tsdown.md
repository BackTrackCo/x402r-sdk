---
"@x402r/core": patch
"@x402r/sdk": patch
"@x402r/cli": patch
"@x402r/helpers": patch
---

Build with tsdown instead of tsup. The public API and type declarations, the
ESM-only `.js`/`.d.ts` filenames, and the `exports` maps are unchanged (verified
via a `.d.ts` export-surface diff and attw). The emitted `.js` is not
byte-identical — Rolldown retains JSDoc comments that esbuild stripped, so a couple
of bundles grew slightly. Bundling moves to Rolldown and declaration generation to
rolldown-plugin-dts; package validation (publint + attw) now runs natively during
the build across all four packages. No runtime or `engines` changes for consumers —
the raised Node floor applies only to building this repo.
