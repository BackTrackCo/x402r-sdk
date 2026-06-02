---
"@x402r/core": patch
"@x402r/sdk": patch
"@x402r/cli": patch
"@x402r/helpers": patch
---

Build with tsdown instead of tsup. The public API, ESM-only `.js`/`.d.ts` output,
and `exports` maps are unchanged (verified via a `.d.ts` export-surface diff and
attw); bundling moves to Rolldown and declaration generation to
rolldown-plugin-dts. Package validation (publint + attw) now runs natively during
the build across all four packages. No runtime or `engines` changes for consumers —
the raised Node floor applies only to building this repo.
