---
"@x402r/core": patch
"@x402r/sdk": patch
"@x402r/cli": patch
"@x402r/helpers": patch
---

Migrate the internal build from tsup to tsdown. No changes to the public API,
type declarations, or package `exports`. The emitted JavaScript is rebuilt —
functionally identical, marginally larger where JSDoc comments are now retained —
so no action is needed on upgrade.
